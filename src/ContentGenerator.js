import React, { useState, useEffect } from 'react';
import { FaCopy, FaBars } from 'react-icons/fa';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from './firebase';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';
import { useNavigate } from 'react-router-dom';

// API URL configuration - Updated for production
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://seocontentgeneration.onrender.com';
console.log('Current API_URL:', API_URL);


//const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
//console.log('Current API_URL:', API_URL);

const MAX_ANONYMOUS_POSTS = 3;

const ContentGenerator = () => {
    const [user, loading] = useAuthState(auth);
    const [prompt, setPrompt] = useState('');
    const [contentType, setContentType] = useState('');
    const [result, setResult] = useState('');
    const [copySuccess, setCopySuccess] = useState('');
    const [wordCount, setWordCount] = useState(0);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [postCount, setPostCount] = useState(0);
    const [anonymousPostCount, setAnonymousPostCount] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState(null);
    const [showSignupPrompt, setShowSignupPrompt] = useState(false);
    const navigate = useNavigate();


    useEffect(() => {
        if (!user) {
            const storedCount = localStorage.getItem('anonymousPostCount');
            setAnonymousPostCount(storedCount ? parseInt(storedCount) : 0);
        }
    }, [user]);

    useEffect(() => {
        const fetchUserData = async () => {
            if (user) {
                try {
                    const userRef = doc(db, 'users', user.uid);
                    const userDoc = await getDoc(userRef);
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setPostCount(userData.postCount || 0);
                    } else {
                        await setDoc(userRef, { postCount: 0 });
                        setPostCount(0);
                    }
                    localStorage.removeItem('anonymousPostCount');
                    setAnonymousPostCount(0);
                } catch (error) {
                    console.error('Error fetching user data:', error);
                    setError('Failed to load user data');
                }
            }
        };
        fetchUserData();
    }, [user]);

    const getRemainingPosts = () => {
        return MAX_ANONYMOUS_POSTS - anonymousPostCount;
    };

    const generateContent = async (e) => {
        e.preventDefault();
        setError(null);

        if (!user && anonymousPostCount >= MAX_ANONYMOUS_POSTS) {
            setShowSignupPrompt(true);
            setError(`You've reached the limit of ${MAX_ANONYMOUS_POSTS} free generations. Please sign in to continue.`);
            return;
        }

        setIsGenerating(true);
        
        const endpoint = user ? 'generate-content' : 'generate-content-anonymous';
        
        try {
            console.log('Sending request to:', `${API_URL}/${endpoint}`);
            
            const headers = {
                'Content-Type': 'application/json'
            };

            if (user) {
                const token = await user.getIdToken();
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_URL}/${endpoint}`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ prompt, contentType }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.choices?.[0]?.message?.content) {
                throw new Error('Invalid response format from server');
            }

            const generatedContent = data.choices[0].message.content;
            setResult(generatedContent);
            setWordCount(generatedContent.split(/\s+/).length);

            if (user) {
                const userRef = doc(db, 'users', user.uid);
                await setDoc(userRef, { postCount: postCount + 1 }, { merge: true });
                setPostCount(prev => prev + 1);
            } else {
                const newCount = anonymousPostCount + 1;
                setAnonymousPostCount(newCount);
                localStorage.setItem('anonymousPostCount', newCount.toString());
                
                if (newCount === MAX_ANONYMOUS_POSTS) {
                    setShowSignupPrompt(true);
                }
            }
        } catch (error) {
            console.error('Error generating content:', error);
            setError(error.message || 'Failed to generate content. Please try again.');
            setResult('');
            setWordCount(0);
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(result.replace(/<br>/g, '\n'))
            .then(() => {
                setCopySuccess('Content copied to clipboard!');
                setTimeout(() => setCopySuccess(''), 3000);
            })
            .catch((err) => {
                console.error('Failed to copy:', err);
                setCopySuccess('Failed to copy content');
            });
    };

    const signIn = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            setShowSignupPrompt(false);
        } catch (error) {
            console.error('Error signing in:', error);
            setError('Failed to sign in. Please try again.');
        }
    };

    const signOutUser = () => {
        signOut(auth).then(() => {
            setPostCount(0);
            setResult('');
            setAnonymousPostCount(0);
            localStorage.removeItem('anonymousPostCount');
        }).catch((error) => {
            console.error('Error signing out:', error);
            setError('Failed to sign out. Please try again.');
        });
    };

    if (loading) {
        return <div className="flex items-center justify-center h-screen">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-indigo-500"></div>
        </div>;
    }

    const handlePaymentRedirect = () => {
        navigate('/payment');
    };

    return (
        <div className="flex h-screen bg-purple-400 w-full">
            {/* Sidebar */}
            <div className={`bg-indigo-700 text-white transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-84' : 'w-16'}`}>
                <div className="p-4">
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white hover:text-indigo-200">
                        <FaBars size={24} />
                    </button>
                </div>
                {sidebarOpen && (
                    <div className="p-4">
                        <h1 className="text-2xl font-bold mb-4">Content Generator</h1>
                        {error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                                <span className="block sm:inline">{error}</span>
                            </div>
                        )}
                        {user ? (
                            <div className="mb-4">
                                <p>Welcome, {user.displayName}!</p>
                                <p>Posts generated: {postCount}</p>
                                <button onClick={signOutUser} className="mt-2 bg-red-500 text-white px-4 py-2 rounded">Sign Out</button>
                            </div>
                        ) : (
                            <div className="mb-4">
                                <p>Try it out! {getRemainingPosts()} free {getRemainingPosts() === 1 ? 'generation' : 'generations'} remaining.</p>
                                {anonymousPostCount >= MAX_ANONYMOUS_POSTS ? (
                                    // Replace the existing sign-in button with this conditional rendering
                                    <div className="space-y-2">
                                        <button 
                                            onClick={handlePaymentRedirect}
                                            className="mt-2 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition duration-300 w-full"
                                        >
                                            Subscribe for Unlimited Access
                                        </button>
                                        <button 
                                            onClick={signIn} 
                                            className="mt-2 bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded flex items-center justify-center shadow-sm hover:bg-gray-100 transition duration-300 w-full"
                                        >
                                            <FontAwesomeIcon icon={faGoogle} className="mr-2" />
                                            <span className="text-sm font-medium">Sign in with Google</span>
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={signIn} 
                                        className="mt-2 bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded flex items-center justify-center shadow-sm hover:bg-gray-100 transition duration-300"
                                        style={{width: "fit-content"}}
                                    >
                                        <FontAwesomeIcon icon={faGoogle} className="mr-2" />
                                        <span className="text-sm font-medium">Sign in with Google</span>
                                    </button>
                                )}
                            </div>
                        )}
                        <form onSubmit={generateContent} className="space-y-4">
                            <div>
                                <label htmlFor="contentType" className="block text-sm font-medium mb-1">Content Type:</label>
                                <input
                                    type="text"
                                    value={contentType}
                                    onChange={(e) => setContentType(e.target.value)}
                                    id="contentType"
                                    className="w-full px-3 py-2 text-black rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="E.g., blog post, article, product description..."
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="prompt" className="block text-sm font-medium mb-1">Prompt:</label>
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    id="prompt"
                                    className="w-full px-3 py-2 text-black rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none overflow-hidden"
                                    placeholder="Describe the content you want to generate..."
                                    rows={3}
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className={`w-full py-2 px-4 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                                    (!user && anonymousPostCount >= MAX_ANONYMOUS_POSTS) ? 'bg-gray-400 cursor-not-allowed' :
                                    !isGenerating ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 cursor-not-allowed'
                                }`}
                                disabled={isGenerating || (!user && anonymousPostCount >= MAX_ANONYMOUS_POSTS)}
                            >
                                {isGenerating ? 'Generating...' : 
                                 (!user && anonymousPostCount >= MAX_ANONYMOUS_POSTS) ? 'Sign in to Generate More' :
                                 'Generate Content'}
                            </button>
                        </form>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto bg-white">
                <div className="p-8">
                    <h2 className="text-2xl font-bold mb-4">Generated Content</h2>
                    {showSignupPrompt && !user && (
                        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-4">
                            <strong className="font-bold">Limit Reached! </strong>
                            <span className="block sm:inline">Sign in to continue generating content without limits.</span>
                        </div>
                    )}
                    <div className="bg-gray-100 p-6 rounded-lg shadow-md min-h-[600px]">
                        <div id="content" className="whitespace-pre-line">
                            {result || 'Generated content will appear here...'}
                        </div>
                        {result && (
                            <div className="mt-4 flex items-center">
                                <button onClick={copyToClipboard} className="flex items-center text-indigo-600 hover:text-indigo-800">
                                    <FaCopy className="mr-2" />
                                    Copy to Clipboard
                                </button>
                                {copySuccess && <p className="text-sm text-green-500">{copySuccess}</p>}
                            </div>
                        )}
                    </div>
                    {wordCount > 0 && (
                        <p className="mt-4 text-sm text-gray-500">
                            Word Count: {wordCount}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContentGenerator;