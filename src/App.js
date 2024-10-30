import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ContentGenerator from './ContentGenerator';
import MpesaPayment from './component/MpesaPayment';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';

const App = () => {
    const [user] = useAuthState(auth);

    return (
        <Router>
            <div className="min-h-screen bg-gradient-to-r from-indigo-500 to-purple-500">
                <Routes>
                    <Route 
                        path="/" 
                        element={
                            <div className="flex justify-center items-center min-h-screen">
                                <ContentGenerator />
                            </div>
                        } 
                    />
                    <Route 
                        path="/payment" 
                        element={
                            <div className="flex justify-center items-center min-h-screen">
                                <MpesaPayment />
                            </div>
                        } 
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        </Router>
    );
};

export default App;
