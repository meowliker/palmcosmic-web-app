import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { headers } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

function getPlanCoins(plan?: string | null) {
  if (plan === "weekly" || plan === "monthly") return 15;
  if (plan === "yearly") return 30;
  return 0;
}

function offersToUnlockedFeatures(offers: string[]) {
  const updates: Record<string, boolean> = {};

  for (const offer of offers) {
    if (offer === "ultra-pack") {
      updates["unlockedFeatures.prediction2026"] = true;
      updates["unlockedFeatures.birthChart"] = true;
      updates["unlockedFeatures.compatibilityTest"] = true;
      continue;
    }
    if (offer === "2026-predictions") updates["unlockedFeatures.prediction2026"] = true;
    if (offer === "birth-chart") updates["unlockedFeatures.birthChart"] = true;
    if (offer === "compatibility") updates["unlockedFeatures.compatibilityTest"] = true;
  }

  return updates;
}

export async function POST(request: NextRequest) {
  try {
    const adminDb = getAdminDb();
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return NextResponse.json(
        { error: "Webhook signature verification failed" },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const { userId, plan, type, offers, coins, feature } = session.metadata || {};
        const resolvedUserId = (userId || "").trim();
        const now = new Date().toISOString();

        // Always store payment record (even if userId missing)
        try {
          const paymentRecord = {
            eventType: event.type,
            stripeEventId: event.id,
            sessionId: session.id,
            userId: resolvedUserId || null,
            type: type || null,
            plan: plan || null,
            offers: offers || null,
            feature: feature || null,
            coins: coins || null,
            customerEmail: session.customer_details?.email || session.customer_email || null,
            amountTotal: session.amount_total ?? null,
            currency: session.currency || null,
            paymentStatus: session.payment_status || null,
            createdAt: now,
          };

          if (resolvedUserId) {
            await adminDb
              .collection("users")
              .doc(resolvedUserId)
              .collection("payments")
              .doc(session.id)
              .set(paymentRecord, { merge: true });
          }

          await adminDb.collection("payments").doc(session.id).set(paymentRecord, { merge: true });
        } catch (err) {
          console.error("Failed to persist payment record:", err);
        }

        if (!resolvedUserId) break;

        const userRef = adminDb.collection("users").doc(resolvedUserId);

        // Ensure base user fields exist
        await userRef.set(
          {
            email: (session.customer_details?.email || session.customer_email || "").toLowerCase() || null,
            updatedAt: now,
          },
          { merge: true }
        );

        if (type === "upsell") {
          const offerList = (offers || "").split(",").map((s) => s.trim()).filter(Boolean);
          const unlockUpdates = offersToUnlockedFeatures(offerList);
          await userRef.set(
            {
              ...unlockUpdates,
              updatedAt: now,
            },
            { merge: true }
          );
        } else if (type === "coins") {
          const coinsToAdd = parseInt(coins || "0", 10) || 0;
          if (coinsToAdd > 0) {
            await userRef.set(
              {
                coins: FieldValue.increment(coinsToAdd),
                updatedAt: now,
              },
              { merge: true }
            );
          }
        } else if (type === "report") {
          if (feature) {
            await userRef.set(
              {
                [`unlockedFeatures.${feature}`]: true,
                updatedAt: now,
              },
              { merge: true }
            );
          }
        } else {
          const coinsToAdd = getPlanCoins(plan || null);
          await userRef.set(
            {
              subscriptionPlan: plan || null,
              subscriptionStatus: "active",
              subscriptionStartedAt: now,
              updatedAt: now,
            },
            { merge: true }
          );
          if (coinsToAdd > 0) {
            await userRef.set(
              {
                coins: FieldValue.increment(coinsToAdd),
                updatedAt: now,
              },
              { merge: true }
            );
          }
        }
        break;
      }

      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("Subscription created:", subscription.id);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const subData = subscription as any;
        const { userId } = subData.metadata || {};
        
        console.log("Subscription updated:", subscription.id, subData.status);
        
        // Check if trial has ended
        if (subData.trial_end && new Date(subData.trial_end * 1000) <= new Date()) {
          // Trial has ended
          if (userId) {
            const now = new Date().toISOString();
            await adminDb
              .collection("users")
              .doc(userId)
              .set(
                {
                  trialCompleted: true,
                  trialEndedAt: new Date(subData.trial_end * 1000).toISOString(),
                  updatedAt: now,
                },
                { merge: true }
              );
          }
        }
        
        if (userId) {
          const now = new Date().toISOString();
          await adminDb
            .collection("users")
            .doc(userId)
            .set(
              {
                stripeSubscriptionId: subscription.id,
                subscriptionStatus: subData.status,
                subscriptionPlan: subData.metadata?.plan || subData.items?.data?.[0]?.price?.lookup_key || null,
                currentPeriodEnd: subData.current_period_end
                  ? new Date(subData.current_period_end * 1000).toISOString()
                  : null,
                updatedAt: now,
              },
              { merge: true }
            );
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const subData = subscription as any;
        const { userId } = subData.metadata || {};
        
        console.log(`Subscription cancelled for user ${userId}`);
        
        if (userId) {
          const now = new Date().toISOString();
          await adminDb
            .collection("users")
            .doc(userId)
            .set(
              {
                subscriptionStatus: "cancelled",
                subscriptionCancelled: true,
                subscriptionEndedAt: now,
                updatedAt: now,
              },
              { merge: true }
            );
        }
        break;
      }

      case "customer.subscription.trial_will_end": {
        // Trial is about to end (3 days before by default)
        const subscription = event.data.object as Stripe.Subscription;
        const subData = subscription as any;
        const { userId } = subData.metadata || {};
        
        console.log(`Trial ending soon for user ${userId}`);
        
        if (userId) {
          const now = new Date().toISOString();
          await adminDb
            .collection("users")
            .doc(userId)
            .set(
              {
                trialEndingSoon: true,
                trialEndDate: subData.trial_end ? new Date(subData.trial_end * 1000).toISOString() : null,
                updatedAt: now,
              },
              { merge: true }
            );
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceData = invoice as any;
        const { userId } = invoiceData.subscription_details?.metadata || {};
        
        console.log("Payment succeeded for invoice:", invoice.id);
        
        if (userId) {
          const now = new Date().toISOString();
          await adminDb
            .collection("users")
            .doc(userId)
            .set(
              {
                paymentStatus: "succeeded",
                lastPaymentDate: now,
                subscriptionStatus: "active",
                updatedAt: now,
              },
              { merge: true }
            );
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceData = invoice as any;
        const { userId } = invoiceData.subscription_details?.metadata || {};
        
        console.log("Payment failed for invoice:", invoice.id);
        
        if (userId) {
          const now = new Date().toISOString();
          await adminDb
            .collection("users")
            .doc(userId)
            .set(
              {
                paymentStatus: "failed",
                paymentFailedAt: now,
                subscriptionStatus: "past_due",
                updatedAt: now,
              },
              { merge: true }
            );
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: error.message || "Webhook handler failed" },
      { status: 500 }
    );
  }
}
