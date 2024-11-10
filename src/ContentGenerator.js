import React, { useState, useEffect } from 'react';
import { FaCopy } from 'react-icons/fa';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from './firebase';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://seocontentgeneration.onrender.com';
const MAX_ANONYMOUS_POSTS = 3;

const ContentGenerator = () => {
    const [user, loading] = useAuthState(auth);
    const [prompt, setPrompt] = useState('');
    const [contentType, setContentType] = useState('');
    const [result, setResult] = useState('');
    const [copySuccess, setCopySuccess] = useState('');
    const [wordCount, setWordCount] = useState(0);
    const [postCount, setPostCount] = useState(0);
    const [anonymousPostCount, setAnonymousPostCount] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState(null);
    const [showSignupPrompt, setShowSignupPrompt] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
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

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.profile-dropdown')) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

    const getInitial = (name) => {
        return name ? name.charAt(0).toUpperCase() : '?';
    };

    const getRandomColor = () => {
        const colors = [
            'bg-blue-500',
            'bg-green-500',
            'bg-purple-500',
            'bg-pink-500',
            'bg-indigo-500',
            'bg-teal-500'
        ];
        // Use user's name as a seed for consistent color
        const index = user ? user.displayName.length % colors.length : 0;
        return colors[index];
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-gray-50">
           <header className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 shadow-lg">
    <div className="container mx-auto flex justify-between items-center">
        {/* Left side - Logo */}
        <div>
            <img
                src="/Logo.png"
                alt="Logo"
                className="h-10 rounded-sm"
            />
        </div>

        {/* Center - Title */}
        <h1 className="text-2xl font-bold tracking-wide">Content Generator</h1>

        {/* Right side - Profile */}
        {user && (
            <div className="relative">
                <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className={`${getRandomColor()} w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold focus:outline-none shadow-md transition-transform transform hover:scale-105`}
                >
                    {getInitial(user.displayName)}
                </button>
                
                {/* Dropdown Menu */}
                {showDropdown && (
                    <div className="absolute right-0 mt-3 w-52 bg-white rounded-lg shadow-lg py-2 z-10">
                        <div className="px-4 py-3 text-sm text-gray-700 border-b">
                            <div className="font-medium">{user.displayName}</div>
                            <div className="text-gray-500 text-xs mt-1">Posts: {postCount}</div>
                        </div>
                        <button
                            onClick={signOutUser}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                            Sign out
                        </button>
                    </div>
                )}
            </div>
        )}
    </div>
</header>




            {/* Rest of the component remains the same... */}
            <main className="container mx-auto px-4 py-6 max-w-lg lg:max-w-4xl">
                <div className="space-y-6 lg:flex lg:space-x-6">
                    {/* User Section */}
                    <div className="bg-white rounded-lg shadow p-4 lg:w-1/3">
                        {error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-sm">
                                {error}
                            </div>
                        )}

                        {user ? (
                            <div className="flex flex-col">
                                <div>
                                    <p className="text-sm text-gray-600">Try our content generator!</p>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <p className="text-sm mb-3">
                                    Try it out! {getRemainingPosts()} free {getRemainingPosts() === 1 ? 'generation' : 'generations'} remaining.
                                </p>
                                {anonymousPostCount >= MAX_ANONYMOUS_POSTS ? (
                                    <div className="space-y-2">
                                        <button 
                                            className="w-full bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700"
                                        >
                                            Subscribe for Unlimited Access
                                        </button>
                                        <button 
                                            onClick={signIn}
                                            className="w-full bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded flex items-center justify-center text-sm hover:bg-gray-50"
                                        >
                                            <FontAwesomeIcon icon={faGoogle} className="mr-2" />
                                            Sign in with Google
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={signIn}
                                        className="w-full bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded flex items-center justify-center text-sm hover:bg-gray-50"
                                    >
                                        <FontAwesomeIcon icon={faGoogle} className="mr-2" />
                                        Sign in with Google
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Content Generation Form */}
                    <div className="bg-white rounded-lg shadow p-4 lg:flex-1">
                        <form onSubmit={generateContent} className="space-y-4">
                            <div>
                                <label htmlFor="contentType" className="block text-sm font-medium text-gray-700 mb-1">
                                    Content Type
                                </label>
                                <input
                                    type="text"
                                    id="contentType"
                                    value={contentType}
                                    onChange={(e) => setContentType(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="E.g., blog post, article..."
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-1">
                                    Prompt
                                </label>
                                <textarea
                                    id="prompt"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Describe the content..."
                                    rows={4}
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isGenerating || (!user && anonymousPostCount >= MAX_ANONYMOUS_POSTS)}
                                className={`w-full py-2 px-4 rounded-md text-sm font-medium text-white
                                    ${(!user && anonymousPostCount >= MAX_ANONYMOUS_POSTS) 
                                        ? 'bg-gray-400' 
                                        : !isGenerating 
                                            ? 'bg-indigo-600 hover:bg-indigo-700' 
                                            : 'bg-gray-400'
                                    }`}
                            >
                                {isGenerating ? 'Generating...' : 
                                 (!user && anonymousPostCount >= MAX_ANONYMOUS_POSTS) ? 'Sign in to Generate' :
                                 'Generate Content'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Generated Content Section */}
                <div className="bg-white rounded-lg shadow p-4 mt-6">
                    <h2 className="text-lg font-medium mb-4">Generated Content</h2>
                    {showSignupPrompt && !user && (
                        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 p-3 rounded mb-4 text-sm">
                            <strong>Limit Reached! </strong>
                            <span>Sign in to continue generating content.</span>
                        </div>
                    )}
                    <div className="bg-gray-50 rounded-lg p-4 min-h-[200px]">
                        <div className="whitespace-pre-line text-sm">
                            {result || 'Generated content will appear here...'}
                        </div>
                        {result && (
                            <div className="mt-4 flex items-center space-x-2">
                                <button 
                                    onClick={copyToClipboard}
                                    className="flex items-center text-indigo-600 text-sm hover:text-indigo-800"
                                >
                                    <FaCopy className="mr-2" />
                                    Copy to Clipboard
                                </button>
                                {copySuccess && (
                                    <p className="text-xs text-green-500">{copySuccess}</p>
                                )}
                            </div>
                        )}
                    </div>
                    {wordCount > 0 && (
                        <p className="mt-4 text-xs text-gray-500">
                            Word Count: {wordCount}
                        </p>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ContentGenerator;
