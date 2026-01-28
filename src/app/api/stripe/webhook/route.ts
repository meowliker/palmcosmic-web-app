import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { headers } from "next/headers";
import { doc, updateDoc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Helper function to update user subscription in Firebase
async function updateUserSubscription(userId: string, data: Record<string, any>) {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      await updateDoc(userRef, {
        ...data,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await setDoc(userRef, {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error updating user subscription:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
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
        const { userId, plan, type, offers } = session.metadata || {};
        
        if (type === "upsell") {
          // Handle upsell payment
          console.log(`Upsell payment completed for user ${userId}, offers: ${offers}`);
          
          // TODO: Update user's unlocked features in Firebase
          // const offerList = offers?.split(",") || [];
          // await unlockUserFeatures(userId, offerList);
          
        } else if (type === "coins") {
          // Handle coin purchase
          const coins = session.metadata?.coins;
          console.log(`Coin purchase completed for user ${userId}, coins: ${coins}`);
          
          // TODO: Add coins to user's account in Firebase
          // await addCoinsToUser(userId, parseInt(coins || "0"));
          
        } else if (type === "report") {
          // Handle individual report purchase
          const feature = session.metadata?.feature;
          console.log(`Report purchase completed for user ${userId}, feature: ${feature}`);
          
          // TODO: Unlock feature for user in Firebase
          // await unlockUserFeature(userId, feature);
          
        } else {
          // Handle subscription payment
          console.log(`Subscription checkout completed for user ${userId}, plan: ${plan}`);
          
          // Add coins based on plan: weekly/monthly = 15 coins, yearly = 30 coins
          let coinsToAdd = 0;
          if (plan === "weekly" || plan === "monthly") {
            coinsToAdd = 15;
          } else if (plan === "yearly") {
            coinsToAdd = 30;
          }
          
          if (userId) {
            await updateUserSubscription(userId, {
              subscriptionPlan: plan,
              subscriptionStatus: "active",
              coins: coinsToAdd,
              subscriptionStartedAt: new Date().toISOString(),
            });
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
            await updateUserSubscription(userId, {
              trialCompleted: true,
              trialEndedAt: new Date(subData.trial_end * 1000).toISOString(),
            });
          }
        }
        
        // Update subscription status
        if (userId) {
          await updateUserSubscription(userId, {
            stripeSubscriptionId: subscription.id,
            subscriptionStatus: subData.status,
            subscriptionPlan: subData.items?.data?.[0]?.price?.lookup_key || null,
            currentPeriodEnd: subData.current_period_end 
              ? new Date(subData.current_period_end * 1000).toISOString() 
              : null,
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const subData = subscription as any;
        const { userId } = subData.metadata || {};
        
        console.log(`Subscription cancelled for user ${userId}`);
        
        if (userId) {
          await updateUserSubscription(userId, {
            subscriptionStatus: "cancelled",
            subscriptionCancelled: true,
            subscriptionEndedAt: new Date().toISOString(),
          });
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
          await updateUserSubscription(userId, {
            trialEndingSoon: true,
            trialEndDate: subData.trial_end 
              ? new Date(subData.trial_end * 1000).toISOString() 
              : null,
          });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceData = invoice as any;
        const { userId } = invoiceData.subscription_details?.metadata || {};
        
        console.log("Payment succeeded for invoice:", invoice.id);
        
        if (userId) {
          await updateUserSubscription(userId, {
            paymentStatus: "succeeded",
            lastPaymentDate: new Date().toISOString(),
            subscriptionStatus: "active",
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceData = invoice as any;
        const { userId } = invoiceData.subscription_details?.metadata || {};
        
        console.log("Payment failed for invoice:", invoice.id);
        
        if (userId) {
          await updateUserSubscription(userId, {
            paymentStatus: "failed",
            paymentFailedAt: new Date().toISOString(),
            subscriptionStatus: "past_due",
          });
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
