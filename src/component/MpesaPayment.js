import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

const MpesaPayment = () => {
  const [user] = useAuthState(auth);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsProcessing(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/initiate-mpesa-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({ 
          phoneNumber,
          userId: user.uid 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Payment failed');
      }

      setSuccess('Payment request sent! Please check your phone to complete the payment.');
      
      // Poll for payment status
      const checkPaymentStatus = setInterval(async () => {
        const statusResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/check-payment-status/${data.checkoutRequestId}`,
          {
            headers: {
              'Authorization': `Bearer ${await user.getIdToken()}`
            }
          }
        );
        const statusData = await statusResponse.json();
        
        if (statusData.status === 'COMPLETED') {
          clearInterval(checkPaymentStatus);
          // Update user subscription status in Firestore
          const userRef = doc(db, 'users', user.uid);
          await setDoc(userRef, {
            hasValidSubscription: true,
            subscriptionDate: new Date().toISOString(),
            phoneNumber: phoneNumber
          }, { merge: true });
          
          setSuccess('Payment successful! Redirecting...');
          setTimeout(() => navigate('/generator'), 2000);
        }
      }, 5000);

      // Clear interval after 2 minutes
      setTimeout(() => {
        clearInterval(checkPaymentStatus);
        if (!success.includes('Redirecting')) {
          setError('Payment timeout. Please try again.');
          setSuccess('');
        }
      }, 120000);

    } catch (err) {
      setError(err.message || 'Failed to process payment');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-purple-400 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">M-Pesa Payment</h2>
        
        <div className="mb-6 text-center">
          <p className="text-gray-600">Subscribe to unlimited content generation</p>
          <p className="text-2xl font-bold mt-2">KES 500</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label 
              htmlFor="phoneNumber" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              M-Pesa Phone Number
            </label>
            <input
              type="tel"
              id="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="254712345678"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
              pattern="254[0-9]{9}"
            />
            <p className="mt-1 text-sm text-gray-500">Format: 254712345678</p>
          </div>

          <button
            type="submit"
            disabled={isProcessing}
            className={`w-full py-2 px-4 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isProcessing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isProcessing ? 'Processing...' : 'Pay with M-Pesa'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          You will receive a prompt on your phone to complete the payment
        </p>
      </div>
    </div>
  );
};

export default MpesaPayment;