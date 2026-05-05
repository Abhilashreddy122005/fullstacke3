import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CreditCard, Lock, CheckCircle, Loader } from 'lucide-react';
import api from '../api/api';
import toast from 'react-hot-toast';

export default function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { bookingId, event, booking } = location.state || {};

  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    if (!bookingId) { navigate('/events'); return; }
    
    // Check if script already exists to prevent duplicate loading
    if (!document.getElementById('razorpay-checkout-script')) {
      const script = document.createElement('script');
      script.id = 'razorpay-checkout-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, [bookingId, navigate]);

  const handlePayNow = async () => {
    setLoading(true);
    try {
      const { data: order } = await api.post('/api/payments/create-order', { bookingId });
      setOrderData(order);

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'EventSphere',
        description: order.eventName,
        order_id: order.orderId,
        prefill: { name: booking?.user?.name, email: booking?.user?.email },
        theme: { color: '#7c3aed' },
        handler: async (response) => {
          try {
            await api.post('/api/payments/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              bookingId,
            });
            setPaymentSuccess(true);
            toast.success('Payment successful! Booking confirmed 🎉');
          } catch {
            toast.error('Payment verification failed. Contact support.');
          }
        },
        modal: {
          ondismiss: () => toast('Payment cancelled.', { icon: '⚠️' }),
        },
      };

      if (!window.Razorpay) {
        toast.error('Razorpay SDK failed to load. Please check your connection.');
        setLoading(false);
        return;
      }

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate payment.');
    } finally {
      setLoading(false);
    }
  };

  if (paymentSuccess) {
    return (
      <div className="payment-success-page">
        <div className="success-card">
          <CheckCircle size={64} color="#22c55e" />
          <h2>Payment Successful!</h2>
          <p>Your booking for <strong>{event?.eventName}</strong> is confirmed.</p>
          <p className="booking-ref-display">Booking Reference: <code>{booking?.bookingReference}</code></p>
          <div className="success-actions">
            <button className="btn-primary" onClick={() => navigate('/my-bookings')}>
              View My Bookings
            </button>
            <button className="btn-secondary" onClick={() => navigate('/events')}>
              Browse Events
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-page">
      <div className="payment-card">
        {/* Header */}
        <div className="payment-header">
          <CreditCard size={32} className="payment-icon" />
          <h2>Complete Payment</h2>
          <p>Secure payment powered by Razorpay</p>
        </div>

        {/* Order Summary */}
        <div className="order-summary">
          <h3>Order Summary</h3>
          <div className="summary-row">
            <span>Event</span>
            <span>{event?.eventName}</span>
          </div>
          <div className="summary-row">
            <span>Tickets</span>
            <span>{booking?.numberOfTickets}</span>
          </div>
          <div className="summary-row">
            <span>Price per Ticket</span>
            <span>₹{event?.price?.toFixed(2)}</span>
          </div>
          <div className="summary-row total">
            <span>Total Amount</span>
            <span className="total-amount">₹{booking?.totalAmount?.toFixed(2)}</span>
          </div>
        </div>

        {/* Security Notice */}
        <div className="security-notice">
          <Lock size={14} />
          <span>256-bit SSL secured. Your payment is 100% safe.</span>
        </div>

        {/* Pay Button */}
        <button
          className="btn-pay-now"
          onClick={handlePayNow}
          disabled={loading}
        >
          {loading ? (
            <><Loader size={16} className="spin" /> Processing…</>
          ) : (
            <>Pay ₹{booking?.totalAmount?.toFixed(2)} Securely</>
          )}
        </button>

        <button className="btn-cancel-payment" onClick={() => navigate(-1)}>
          Cancel & Go Back
        </button>
      </div>
    </div>
  );
}
