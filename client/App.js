import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, RefreshControl, Platform, TouchableOpacity, Image, LogBox, useWindowDimensions, TextInput, Alert, KeyboardAvoidingView, Modal, Linking, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// Set notification handler
LogBox.ignoreAllLogs();
LogBox.ignoreLogs(['expo-notifications: Android Push notifications']);
import YoutubePlayer from 'react-native-youtube-iframe';
import { LinearGradient } from 'expo-linear-gradient';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Speech from 'expo-speech';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // Fallback
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Bypass firewall issues by using the public tunnel URL
// 1. USE LAN IP (Most Stable)
const API_URL = 'https://4c5e1d913015.ngrok-free.app/api/temples';




const AuthScreen = ({ onLogin }) => {
    const [mode, setMode] = useState('login'); // 'login', 'register', or 'forgot'
    const [name, setName] = useState('');
    const [contact, setContact] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [wantsToWorkAsGuide, setWantsToWorkAsGuide] = useState(false);
    const [editPhone, setEditPhone] = useState(''); // Added for profile phone editing
    const [isAuthLoading, setIsAuthLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [authStep, setAuthStep] = useState('initial'); // 'initial' or 'otp'
    const [otp, setOtp] = useState('');
    const [timer, setTimer] = useState(0);

    useEffect(() => {
        let interval;
        if (timer > 0) {
            interval = setInterval(() => setTimer(t => t - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const handleAuth = async () => {
        if (!contact.trim()) {
            Alert.alert("Error", "Please enter your Email or Mobile");
            return;
        }

        if (mode === 'forgot') {
            handleResetPassword();
            return;
        }

        if (!password.trim()) {
            Alert.alert("Error", "Please enter password");
            return;
        }

        if (mode === 'register') {
            if (!name.trim()) {
                Alert.alert("Error", "Please enter your name");
                return;
            }
            if (password !== confirmPassword) {
                Alert.alert("Error", "Passwords do not match");
                return;
            }
        }

        // --- NEW OTP LOGIC START ---
        if (authStep === 'initial') {
            setIsAuthLoading(true);
            try {
                const sendOtpUrl = API_URL.replace('temples', 'send-otp');
                const response = await fetch(sendOtpUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                    body: JSON.stringify({ contact: contact.trim(), type: mode })
                });
                const data = await response.json();
                if (data.success) {
                    setAuthStep('otp');
                    setTimer(60);
                    Alert.alert("Verification", `OTP has been sent to ${contact.trim()}`);
                } else {
                    Alert.alert("Error", data.error || "Failed to send OTP");
                }
            } catch (error) {
                Alert.alert("Connection Error", "System failed to send OTP.");
            } finally {
                setIsAuthLoading(false);
            }
            return;
        }

        // Verify OTP Step
        if (!otp.trim() || otp.length < 6) {
            Alert.alert("Error", "Please enter valid 6-digit OTP");
            return;
        }

        setIsAuthLoading(true);
        try {
            const verifyOtpUrl = API_URL.replace('temples', 'verify-otp');
            const verifyRes = await fetch(verifyOtpUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                body: JSON.stringify({ contact: contact.trim(), code: otp })
            });
            const verifyData = await verifyRes.json();
            
            if (!verifyData.success) {
                Alert.alert("Verification Failed", verifyData.error || "Incorrect OTP");
                setIsAuthLoading(false);
                return;
            }

            // OTP Verified! Now proceed to actual login/register
            const apiEndpoint = mode === 'login' ? 'login' : 'register';
            const body = mode === 'login' 
                ? { contact: contact.trim(), password } 
                : { 
                    name: name.trim(), 
                    contact: contact.trim(), 
                    password,
                    wantsToWorkAsGuide 
                  };

            const loginUrl = API_URL.replace('temples', apiEndpoint);
            
            const response = await fetch(loginUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            if (data.success) {
                onLogin(data.user);
            } else {
                Alert.alert(`${mode === 'login' ? 'Login' : 'Registration'} Failed`, data.error || "Please try again");
                setAuthStep('initial'); // Reset on failure
            }
        } catch (error) {
            console.error(`${mode} request failed:`, error);
            Alert.alert("Error", "Auth process interrupted: " + error.message);
        } finally {
            setIsAuthLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!password.trim() || password !== confirmPassword) {
            Alert.alert("Error", "Passwords must match and cannot be empty");
            return;
        }

        setIsAuthLoading(true);
        try {
            const resetUrl = API_URL.replace('temples', 'reset-password');
            const response = await fetch(resetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                body: JSON.stringify({ contact: contact.trim(), newPassword: password })
            });

            const data = await response.json();
            if (data.success) {
                Alert.alert("Success", "Password reset successfully. Please login.");
                setMode('login');
                setPassword('');
                setConfirmPassword('');
            } else if (data.error && data.error.includes("not found")) {
                Alert.alert(
                    "યુઝર મળ્યા નથી",
                    "આ નંબર રજીસ્ટર થયેલ નથી. મહેરબાની કરીને પહેલા રજીસ્ટ્રેશન કરો.",
                    [
                        { text: "OK", onPress: () => setMode('register') }
                    ]
                );
            } else {
                Alert.alert("Error", data.error || "Failed to reset password");
            }
        } catch (error) {
            Alert.alert("Error", "Server connection failed: " + error.message);
        } finally {
            setIsAuthLoading(false);
        }
    };

    return (
        <View style={styles.loginWrapper}>
            <LinearGradient colors={['#FFD194', '#D1913C']} style={styles.loginGradient}>
                <StatusBar style="dark" />
                <KeyboardAvoidingView 
                    behavior={Platform.OS === "ios" ? "padding" : "padding"}
                    style={styles.loginContainer}
                >
                    <ScrollView 
                        showsVerticalScrollIndicator={false} 
                        contentContainerStyle={styles.loginScrollContent}
                    >
                    <View style={styles.loginCard}>
                        <View style={styles.loginHeaderContainer}>
                             <Text style={styles.loginEmoji}>🕉️</Text>
                             <Text style={styles.premiumLoginTitle}>Divya Darshan</Text>
                             <Text style={styles.loginSubtitle}>
                                 {mode === 'login' ? 'Welcome Back!' : mode === 'register' ? 'Create New Account' : 'Reset Your Password'}
                             </Text>
                        </View>

                        {authStep === 'initial' ? (
                        <>
                        {mode === 'register' && (
                            <View style={styles.inputContainer}>
                                <Text style={styles.premiumLabel}>Full Name</Text>
                                <TextInput 
                                    style={styles.premiumInput} 
                                    placeholder="Enter your name" 
                                    value={name}
                                    onChangeText={setName}
                                    placeholderTextColor="#C19A6B"
                                />
                            </View>
                        )}

                        <View style={styles.inputContainer}>
                            <Text style={styles.premiumLabel}>Email / Mobile Number</Text>
                            <TextInput 
                                style={styles.premiumInput} 
                                placeholder="Enter email or mobile" 
                                value={contact}
                                onChangeText={setContact}
                                placeholderTextColor="#C19A6B"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.premiumLabel}>{mode === 'forgot' ? 'New Password' : 'Password'}</Text>
                            <View style={styles.passwordInputContainer}>
                                <TextInput 
                                    style={[styles.premiumInput, { flex: 1, marginBottom: 0, borderBottomWidth: 0 }]} 
                                    placeholder={mode === 'forgot' ? "Enter new password" : "Enter password"} 
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholderTextColor="#C19A6B"
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity 
                                    onPress={() => setShowPassword(!showPassword)}
                                    style={styles.eyeIcon}
                                >
                                    <Ionicons name={showPassword ? "eye" : "eye-off"} size={22} color="#C19A6B" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {(mode === 'register' || mode === 'forgot') && (
                            <View style={styles.inputContainer}>
                                <Text style={styles.premiumLabel}>Confirm Password</Text>
                                <View style={styles.passwordInputContainer}>
                                    <TextInput 
                                        style={[styles.premiumInput, { flex: 1, marginBottom: 0, borderBottomWidth: 0 }]} 
                                        placeholder="Confirm your password" 
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        placeholderTextColor="#C19A6B"
                                        secureTextEntry={!showConfirmPassword}
                                    />
                                    <TouchableOpacity 
                                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                        style={styles.eyeIcon}
                                    >
                                        <Ionicons name={showConfirmPassword ? "eye" : "eye-off"} size={22} color="#C19A6B" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                        </>
                        ) : (
                            <View style={[styles.inputContainer, { alignItems: 'center' }]}>
                                <Text style={[styles.premiumLabel, { textAlign: 'center', fontSize: 18, marginBottom: 15 }]}>
                                    Verify {contact.includes('@') ? 'Email' : 'SMS'} OTP
                                </Text>
                                <Text style={{ color: '#666', textAlign: 'center', marginBottom: 20 }}>
                                    We've sent a 6-digit code to {contact}
                                </Text>
                                <TextInput 
                                    style={[styles.premiumInput, { width: '80%', textAlign: 'center', fontSize: 24, letterSpacing: 5, borderBottomWidth: 2 }]} 
                                    placeholder="000000" 
                                    value={otp}
                                    onChangeText={setOtp}
                                    placeholderTextColor="#C19A6B"
                                    keyboardType="numeric"
                                    maxLength={6}
                                />
                                <TouchableOpacity 
                                    disabled={timer > 0} 
                                    onPress={() => { setAuthStep('initial'); handleAuth(); }}
                                    style={{ marginTop: 20 }}
                                >
                                    <Text style={{ color: timer > 0 ? '#999' : '#D35400', fontWeight: 'bold' }}>
                                        {timer > 0 ? `Resend OTP in ${timer}s` : "Resend Verification Code"}
                                    </Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    onPress={() => setAuthStep('initial')}
                                    style={{ marginTop: 15 }}
                                >
                                    <Text style={{ color: '#8B4513', fontSize: 13 }}>Change Details</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {mode === 'register' && authStep === 'initial' && (
                            <TouchableOpacity 
                                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingHorizontal: 5 }}
                                onPress={() => setWantsToWorkAsGuide(!wantsToWorkAsGuide)}
                            >
                                <View style={{ 
                                    width: 22, 
                                    height: 22, 
                                    borderWidth: 2, 
                                    borderColor: '#FF9933', 
                                    borderRadius: 6,
                                    marginRight: 10,
                                    backgroundColor: wantsToWorkAsGuide ? '#FF9933' : 'transparent',
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }}>
                                    {wantsToWorkAsGuide && <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>✓</Text>}
                                </View>
                                <Text style={{ color: '#5D4037', fontSize: 14, fontWeight: 'bold' }}>
                                    શું તમે લોકલ ગાઈડ તરીકે કામ કરવા માંગો છો?
                                </Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity 
                            activeOpacity={0.8} 
                            onPress={handleAuth}
                            disabled={isAuthLoading}
                        >
                            <LinearGradient colors={['#FF9933', '#FF512F']} style={styles.premiumLoginButton}>
                                {isAuthLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.loginButtonText}>
                                        {authStep === 'otp' ? 'Verify & Continue' : (mode === 'login' ? 'Login' : mode === 'register' ? 'Register Now' : 'Reset Password')}
                                    </Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        {mode === 'login' && (
                            <TouchableOpacity onPress={() => setMode('forgot')} style={styles.forgotButton}>
                                <Text style={styles.forgotText}>Forgot Password?</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity 
                            style={styles.toggleModeButton} 
                            onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setAuthStep('initial'); }}
                        >
                            <Text style={styles.toggleModeText}>
                                {mode === 'login' 
                                    ? "Don't have an account? Register" 
                                    : "Already have an account? Login"}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.skipButton} onPress={() => onLogin(null)}>
                            <Text style={styles.skipButtonText}>Continue as Guest</Text>
                        </TouchableOpacity>
                    </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </LinearGradient>
        </View>
    );
};

// MULTI-LANGUAGE TRANSLATIONS (Static UI Elements)
const TRANSLATIONS = {
  gu: { // Gujarati
    appName: "દિવ્ય દર્શન",
    home: "હોમ",
    temples: "મંદિરો",
    profile: "પ્રોફાઇલ",
    about: "વિશે",
    logout: "લોગઆઉટ",
    login: "લોગિન",
    register: "નોંધણી",
    submit: "સબમિટ",
    loading: "લોડ થઈ રહ્યું છે...",
    liveNow: "લાઈવ હવે",
    viewDetails: "વિગતો જુઓ",
    history: "ઇતિહાસ",
    architecture: "સ્થાપત્ય",
    significance: "મહત્વ",
    bestTimeToVisit: "શ્રેષ્ઠ સમય",
    howToReach: "કેવી રીતે પહોંચવું",
    nearbyAttractions: "નજીકના આકર્ષણો",
    selectLanguage: "ભાષા પસંદ કરો",
    gujarati: "ગુજરાતી",
    hindi: "હિન્દી",
    english: "અંગ્રેજી",
    watchLive: "લાઈવ જુઓ",
    templeDetails: "મંદિર વિગતો",
    noTemplesFound: "કોઈ મંદિરો મળ્યા નહીં",
    refreshing: "તાજું કરી રહ્યું છે...",
  },
  hi: { // Hindi
    appName: "दिव्य दर्शन",
    home: "होम",
    temples: "मंदिर",
    profile: "प्रोफाइल",
    about: "के बारे में",
    logout: "लॉगआउट",
    login: "लॉगिन",
    register: "रजिस्टर",
    submit: "सबमिट",
    loading: "लोड हो रहा है...",
    liveNow: "लाइव अभी",
    viewDetails: "विवरण देखें",
    history: "इतिहास",
    architecture: "वास्तुकला",
    significance: "महत्व",
    bestTimeToVisit: "सर्वोत्तम समय",
    howToReach: "कैसे पहुंचे",
    nearbyAttractions: "आस-पास के आकर्षण",
    selectLanguage: "भाषा चुनें",
    gujarati: "गुजराती",
    hindi: "हिंदी",
    english: "अंग्रेज़ी",
    watchLive: "लाइव देखें",
    templeDetails: "मंदिर विवरण",
    noTemplesFound: "कोई मंदिर नहीं मिला",
    refreshing: "ताज़ा हो रहा है...",
  },
  en: { // English
    appName: "Divine Darshan",
    home: "Home",
    temples: "Temples",
    profile: "Profile",
    about: "About",
    logout: "Logout",
    login: "Login",
    register: "Register",
    submit: "Submit",
    loading: "Loading...",
    liveNow: "Live Now",
    viewDetails: "View Details",
    history: "History",
    architecture: "Architecture",
    significance: "Significance",
    bestTimeToVisit: "Best Time",
    howToReach: "How to Reach",
    nearbyAttractions: "Nearby Attractions",
    selectLanguage: "Select Language",
    gujarati: "Gujarati",
    hindi: "Hindi",
    english: "English",
    watchLive: "Watch Live",
    templeDetails: "Temple Details",
    noTemplesFound: "No Temples Found",
    refreshing: "Refreshing...",
  }
};

// Helper: Get Static UI Text
const getTranslation = (key, lang = 'gu') => {
  return TRANSLATIONS[lang]?.[key] || TRANSLATIONS['gu']?.[key] || key;
};

// Helper: Get Dynamic Temple Data (from Backend Fields)
const getTempleTranslation = (temple, field, lang = 'gu') => {
  if (!temple) return "";
  
  // 1. Default (Gujarati) -> Return base field
  if (lang === 'gu') return temple[field] || "";

  // 2. Check for dynamic language field (e.g., name_en, history_hi)
  const dynamicKey = `${field}_${lang}`;
  if (temple[dynamicKey] && temple[dynamicKey].trim() !== "") {
      return temple[dynamicKey];
  }

  // 3. Fallback to base field if translation missing
  return temple[field] || "";
};

const getDistrictTranslation = (district, lang = 'gu') => {
    if (!district || district === 'Other') return lang === 'gu' ? 'અન્ય' : (lang === 'hi' ? 'अन्य' : 'Other');
    
    if (lang === 'en') return district;
    
    const districtMap = {
        "Gir Somnath": { gu: "ગીર સોમનાથ", hi: "गीર सोमनाथ" },
        "Devbhumi Dwarka": { gu: "દેવભૂમિ દ્વારકા", hi: "देवभूमि द्वारका" },
        "Kheda": { gu: "ખેડા", hi: "खेड़ा" },
        "Bhavnagar": { gu: "ભાવનગર", hi: "भावनगर" },
        "Ahmedabad": { gu: "અમદાવાદ", hi: "अहमदाबाद" },
        "Amreli": { gu: "અમરેલી", hi: "अमरेली" },
        "Anand": { gu: "આણંદ", hi: "आनंद" },
        "Aravalli": { gu: "અરવલ્લી", hi: "अरावली" },
        "Banaskantha": { gu: "બનાસકાંઠા", hi: "બનાસકાંઠા" },
        "Bharuch": { gu: "ભરૂચ", hi: "ભરૂચ" },
        "Botad": { gu: "બોટાદ", hi: "बोटाद" },
        "Chhota Udaipur": { gu: "છોટા ઉદેપુર", hi: "छोटा उदयपुर" },
        "Dahod": { gu: "દાહોદ", hi: "दाहोद" },
        "Dang": { gu: "ડાંગ", hi: "ડાંગ" },
        "Gandhinagar": { gu: "ગાંધીનગર", hi: "ગાંધીનગર" },
        "Jamnagar": { gu: "જામનગર", hi: "જામનગર" },
        "Junagadh": { gu: "જૂનાગઢ", hi: "જૂનાગઢ" },
        "Kutch": { gu: "કચ્છ", hi: "કચ્છ" },
        "Mahisagar": { gu: "મહીસાગર", hi: "મહીસાગર" },
        "Mehsana": { gu: "મહેસાણા", hi: "મહેસાણા" },
        "Morbi": { gu: "મોરબી", hi: "મોરબી" },
        "Narmada": { gu: "નર્મદા", hi: "નર્મદા" },
        "Navsari": { gu: "નવસારી", hi: "નવસારી" },
        "Panchmahal": { gu: "પંચમહાલ", hi: "પંચમહાલ" },
        "Patan": { gu: "પાટણ", hi: "પાટણ" },
        "Porbandar": { gu: "પોરબંદર", hi: "પોરબંદર" },
        "Rajkot": { gu: "રાજકોટ", hi: "રાજકોટ" },
        "Sabarkantha": { gu: "સાબરકાંઠા", hi: "સાબરકાંઠા" },
        "Surat": { gu: "સુરત", hi: "સુરત" },
        "Surendranagar": { gu: "સુરેન્દ્રનગર", hi: "સુરેન્દ્રનગર" },
        "Tapi": { gu: "તાપી", hi: "તાપી" },
        "Vadodara": { gu: "વડોદરા", hi: "વડોદરા" },
        "Valsad": { gu: "વલસાડ", hi: "વલસાડ" }
    };

    return districtMap[district]?.[lang] || district;
};

// Helper: Check if translation is needed for selected language
const needsTranslation = (temple, lang) => {
  if (lang === 'gu' || !temple) return false;
  const fields = ['history', 'architecture', 'significance', 'bestTimeToVisit', 'howToReach', 'nearbyAttractions'];
  return fields.some(f => !temple[`${f}_${lang}`] || temple[`${f}_${lang}`].trim() === '');
};

export default function App() {
  const [templeData, setTempleData] = useState([]); 
  const [selectedTemple, setSelectedTemple] = useState(null); 
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [language, setLanguage] = useState('gu'); // 'gu', 'hi', 'en'
  const [isCheckingLive, setIsCheckingLive] = useState(false); // To show "Checking..." status
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [isJourneyVisible, setIsJourneyVisible] = useState(false);
  const [journeyOrigin, setJourneyOrigin] = useState('');
  const [journeyDestination, setJourneyDestination] = useState('');
  const [journeySteps, setJourneySteps] = useState([]);
  const [journeyTitle, setJourneyTitle] = useState('');
  const [journeyRoutePath, setJourneyRoutePath] = useState('');
  const [journeyDistance, setJourneyDistance] = useState('');
  const [journeyEstimatedTime, setJourneyEstimatedTime] = useState('');
  const [travelMode, setTravelMode] = useState('road'); // 'road', 'train', or 'flight'
  const [isJourneyLoading, setIsJourneyLoading] = useState(false);
  const [reminders, setReminders] = useState([]); // List of temple names with reminders
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState(''); // Correctly added to App scope
  const [isUpdating, setIsUpdating] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  
  // Menu States
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isAboutVisible, setIsAboutVisible] = useState(false);
  const [isGuideExpanded, setIsGuideExpanded] = useState(false);
  const [isProfileVisible, setIsProfileVisible] = useState(false);
  const [isDonationVisible, setIsDonationVisible] = useState(false);
  const [isRatingVisible, setIsRatingVisible] = useState(false);
  const [tempRating, setTempRating] = useState(0);
  const [isSuggestionVisible, setIsSuggestionVisible] = useState(false);
  const [suggestionCategory, setSuggestionCategory] = useState('New Temple');
  const [suggestionMessage, setSuggestionMessage] = useState('');
  const [isSendingSuggestion, setIsSendingSuggestion] = useState(false);
  
  // Local Guide States
  const [isGuideRegVisible, setIsGuideRegVisible] = useState(false);
  const [isGuidesModalVisible, setIsGuidesModalVisible] = useState(false);
  const [guideDistrictList, setGuideDistrictList] = useState([]);
  const [isGuidesLoading, setIsGuidesLoading] = useState(false);
  const [guideFormData, setGuideFormData] = useState({
      name: '',
      contact: '',
      gender: 'Male',
      age: '',
      district: 'Ahmedabad',
      area: '',
      experience: '',
      languages: '',
      bio: '',
      hourlyRate: ''
  });
  const [isRegisteringGuide, setIsRegisteringGuide] = useState(false);
  
  // Appointment States
  const [guideAppointments, setGuideAppointments] = useState([]);
  const [userAppointments, setUserAppointments] = useState([]);
  const [isAppointmentsVisible, setIsAppointmentsVisible] = useState(false);
  const [isUserBookingsVisible, setIsUserBookingsVisible] = useState(false);
  const [isAppointmentsLoading, setIsAppointmentsLoading] = useState(false);
  
  // Booking States
  const [isBookingModalVisible, setIsBookingModalVisible] = useState(false);
  const [selectedGuideForBooking, setSelectedGuideForBooking] = useState(null);
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [isBookingLoading, setIsBookingLoading] = useState(false);
  
  // Review States
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [selectedAppointmentForReview, setSelectedAppointmentForReview] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewedAppointments, setReviewedAppointments] = useState(new Set());
  
  // Admin States
  const [isAdminVisible, setIsAdminVisible] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState('suggestions'); // 'suggestions', 'ratings', 'addTemple'
  const [adminSuggestions, setAdminSuggestions] = useState([]);
  const [adminRatings, setAdminRatings] = useState([]);
  const [adminGuides, setAdminGuides] = useState([]);
  const [newTemple, setNewTemple] = useState({ 
    state: 'ગુજરાત', 
    name: '', 
    description: '', 
    liveVideoId: '', 
    location: '', 
    history: '',
    architecture: '',
    significance: '',
    bestTimeToVisit: '',
    howToReach: '',
    nearbyAttractions: '',
    history_en: '',
    history_hi: '',
    suggestionId: null,
    liveChannelUrl: '',
    aartiTimings: ''
  });
  
  // Admin Registration State
  const [adminRegisterData, setAdminRegisterData] = useState({
      id: null,
      name: '',
      contact: '',
      phoneNumber: '',
      password: '',
      role: 'user' // 'main_admin', 'sub_admin', 'user'
  });
  
  const [adminUsers, setAdminUsers] = useState([]); // List of users for management
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  
  // Hook must be at the top level
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  useEffect(() => {
    if (user) {
        if (user.wantsToWorkAsGuide) {
            fetchGuideAppointments();
        }
        fetchUserBookings();
        
        const interval = setInterval(() => {
            if (user.wantsToWorkAsGuide) fetchGuideAppointments();
            fetchUserBookings();
        }, 30000); // Check every 30s
        return () => clearInterval(interval);
    }
  }, [user]);

  const fetchUserBookings = async () => {
    if (!user) return;
    try {
        const url = API_URL.replace('/temples', `/appointments/user/${user.contact}`);
        const response = await fetch(url, { headers: { 'ngrok-skip-browser-warning': 'true' } });
        const data = await response.json();
        if (Array.isArray(data)) {
            setUserAppointments(data);
            
            // Check which appointments have been reviewed
            const reviewedIds = new Set();
            for (const appointment of data) {
                try {
                    const reviewCheckUrl = API_URL.replace('/temples', `/reviews/can-review/${appointment.id}`);
                    const reviewResponse = await fetch(reviewCheckUrl, { headers: { 'ngrok-skip-browser-warning': 'true' } });
                    const reviewData = await reviewResponse.json();
                    if (!reviewData.canReview) {
                        reviewedIds.add(appointment.id);
                    }
                } catch (e) {
                    console.error("Error checking review status:", e);
                }
            }
            setReviewedAppointments(reviewedIds);
        }
    } catch (e) { console.error("Error fetching user bookings:", e); }
  };

  const fetchGuideAppointments = async () => {
    if (!user || !user.wantsToWorkAsGuide) return;
    try {
        const url = API_URL.replace('/temples', `/appointments/guide/${user.contact}`);
        const response = await fetch(url, { headers: { 'ngrok-skip-browser-warning': 'true' } });
        const data = await response.json();
        if (Array.isArray(data)) {
            setGuideAppointments(data);
        }
    } catch (e) { console.error("Error fetching appointments:", e); }
  };

  const handleUpdateAppointmentStatus = async (id, status) => {
      try {
          const url = API_URL.replace('/temples', '/appointments/update-status');
          const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
              body: JSON.stringify({ id, status })
          });
          const data = await response.json();
          if (data.success) {
              fetchGuideAppointments();
              Alert.alert("Success", status === 'accepted' ? "Appointment Accepted!" : "Appointment Rejected");
          }
      } catch (e) {
          Alert.alert("Error", "Failed to update appointment status");
      }
  };

  const handleSubmitReview = async () => {
      if (!selectedAppointmentForReview) return;
      
      if (reviewRating === 0) {
          Alert.alert("Error", "Please select a rating");
          return;
      }

      setIsSubmittingReview(true);
      try {
          const url = API_URL.replace('/temples', '/reviews/submit');
          const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
              body: JSON.stringify({
                  guideContact: selectedAppointmentForReview.guideContact,
                  guideName: selectedAppointmentForReview.guideName,
                  userContact: user.contact,
                  userName: user.name,
                  appointmentId: selectedAppointmentForReview.id,
                  rating: reviewRating,
                  comment: reviewComment.trim()
              })
          });
          
          const data = await response.json();
          if (data.success) {
              Alert.alert("સફળ!", "તમારી સમીક્ષા સફળતાપૂર્વક સબમિટ થઈ ગઈ છે!");
              setReviewedAppointments(prev => new Set([...prev, selectedAppointmentForReview.id]));
              setIsReviewModalVisible(false);
              setReviewRating(0);
              setReviewComment('');
              setSelectedAppointmentForReview(null);
          } else {
              Alert.alert("Error", data.error || "Failed to submit review");
          }
      } catch (error) {
          Alert.alert("Error", "Failed to submit review: " + error.message);
      } finally {
          setIsSubmittingReview(false);
      }
  };

  // Auto-prompt to translate if content is missing when language changes
  useEffect(() => {
    if (selectedTemple && needsTranslation(selectedTemple, language)) {
         // Ask user if they want to translate missing content
         // Using a non-intrusive approach is better but user wants it converted.
         // Let's just run it if they are NOT on Gujarati.
         if (language !== 'gu') {
             // We can trigger it automatically, but we need to pass the current language context
             // to handleAutoTranslate. Since handleAutoTranslate uses state 'language', 
             // and this useEffect runs AFTER 'language' state updates, it is safe!
             
             // UNCOMMENT BELOW LINE TO MAKE IT FULLY AUTOMATIC
             // handleAutoTranslate(); 
             
             // OR show a toast/alert? User prefers "convert karvi che" -> Convert it!
             // Just one risk: Rate limits.
             // I'll show an Alert that allows them to start it immediately.
             
             Alert.alert(
                 "Translation Available",
                 `Would you like to translate the guide to ${language === 'hi' ? 'Hindi' : 'English'}?`,
                 [
                     { text: "No", style: "cancel" },
                     { text: "Yes, Translate All", onPress: () => handleAutoTranslate() }
                 ]
             );
         }
    }
  }, [language]);

  const handleUpdateProfile = async () => {
      if (!editName.trim()) {
          Alert.alert("Error", "Please enter your name");
          return;
      }

      setIsUpdating(true);
      try {
          const updateUrl = API_URL.replace('temples', 'update-profile');
          const response = await fetch(updateUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
              body: JSON.stringify({ contact: user.contact, name: editName.trim(), phoneNumber: editPhone.trim() })
          });

          const data = await response.json();
          if (data.success) {
              setUser(data.user);
              Alert.alert("સફળ", "તમારી પ્રોફાઇલ અપડેટ થઈ ગઈ છે!");
          } else {
              Alert.alert("Error", data.error || "Failed to update profile");
          }
      } catch (error) {
          Alert.alert("Error", "Server connection failed: " + error.message);
      } finally {
          setIsUpdating(false);
      }
  };

  const handleRegisterGuide = async () => {
    if (!guideFormData.name || !guideFormData.contact || !guideFormData.district) {
        Alert.alert("Error", "મહેરબાની કરીને નામ, સંપર્ક અને જિલ્લો ભરો.");
        return;
    }

    setIsRegisteringGuide(true);
    try {
        const url = API_URL.replace('/temples', '/guides/register');
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
            body: JSON.stringify(guideFormData)
        });

        const data = await response.json();
        if (data.success) {
            Alert.alert("સફળ", "તમારી ગાઈડ તરીકે નોંધણી થઈ ગઈ છે! એડમિન વેરિફિકેશન પછી તમારું નામ લિસ્ટમાં દેખાશે.");
            setIsGuideRegVisible(false);
        } else {
            Alert.alert("Error", data.error || "Failed to register");
        }
    } catch (error) {
        Alert.alert("Error", "Server connection failed: " + error.message);
    } finally {
        setIsRegisteringGuide(false);
    }
  };

  const fetchGuidesByDistrict = async (district) => {
    if (!district) {
        console.log("No district provided to fetchGuidesByDistrict");
        return;
    }
    setIsGuidesLoading(true);
    setGuideDistrictList([]); // Clear previous list
    try {
        const encodedDistrict = encodeURIComponent(district.trim());
        const url = API_URL.replace('/temples', `/guides/${encodedDistrict}`);
        console.log("Fetching guides for:", district.trim(), "URL:", url);
        
        const response = await fetch(url, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Response data for guides:", JSON.stringify(data));
        
        if (Array.isArray(data)) {
            // Filter only verified guides - VERY robust check
            const verifiedGuides = data.filter(g => 
                g.isVerified === true || 
                g.isVerified === 'true' || 
                g.isVerified === 1 || 
                g.isVerified === '1' ||
                String(g.isVerified).toLowerCase() === 'true'
            );
            console.log(`Filtering: ${data.length} total -> ${verifiedGuides.length} verified`);
            
            // Fetch reviews for each guide
            const guidesWithReviews = await Promise.all(
                verifiedGuides.map(async (guide) => {
                    try {
                        const reviewUrl = API_URL.replace('/temples', `/reviews/guide/${guide.contact}`);
                        const reviewResponse = await fetch(reviewUrl, {
                            headers: { 'ngrok-skip-browser-warning': 'true' }
                        });
                        const reviews = await reviewResponse.json();
                        
                        return {
                            ...guide,
                            reviews: Array.isArray(reviews) ? reviews : [],
                            reviewCount: Array.isArray(reviews) ? reviews.length : 0
                        };
                    } catch (error) {
                        console.log("Error fetching reviews for guide:", guide.contact, error);
                        return {
                            ...guide,
                            reviews: [],
                            reviewCount: 0
                        };
                    }
                })
            );
            
            setGuideDistrictList(guidesWithReviews);
        } else {
            console.log("Invalid data format received for guides:", data);
        }
    } catch (error) {
        console.log("Fetch guides error:", error);
        Alert.alert("Error", "Could not fetch guides: " + error.message);
    } finally {
        setIsGuidesLoading(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!user) {
        Alert.alert("Login Required", "To book a guide, please login or register first.");
        setIsBookingModalVisible(false);
        setIsProfileVisible(true);
        return;
    }

    if (!bookingDate) {
        Alert.alert("Error", "Please select a preferred date for booking.");
        return;
    }

    setIsBookingLoading(true);
    try {
        const url = API_URL.replace('/temples', '/appointments/book');
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
            body: JSON.stringify({
                userName: user.name,
                userContact: user.contact,
                guideContact: selectedGuideForBooking?.contact,
                guideName: selectedGuideForBooking?.name,
                date: bookingDate
            })
        });

        const data = await response.json();
        if (data.success) {
            setIsBookingModalVisible(false);
            fetchUserBookings(); // Refresh list immediately
            Alert.alert(
                "Booking Sent! ✅", 
                `Your request for ${selectedGuideForBooking?.name} on ${bookingDate} has been sent. The guide will notify you once they accept.`,
                [{ text: "OK", onPress: () => setIsGuidesModalVisible(false) }]
            );
        } else {
            Alert.alert("Error", data.error || "Failed to book appointment");
        }
    } catch (error) {
        Alert.alert("Error", "Server connection failed: " + error.message);
    } finally {
        setIsBookingLoading(false);
    }
  };

  const handleSendSuggestion = async () => {
    if (!user) {
        Alert.alert("લોગિન જરૂરી છે", "સૂચન મોકલવા માટે મહેરબાની કરીને લોગિન કરો.");
        setIsSuggestionVisible(false);
        return;
    }
    if (!suggestionMessage.trim()) {
        Alert.alert("ભૂલ", "મહેરબાની કરીને તમારું સૂચન લખો.");
        return;
    }

    setIsSendingSuggestion(true);
    try {
        const suggestUrl = API_URL.replace('temples', 'suggestions');
        const response = await fetch(suggestUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
            body: JSON.stringify({ 
                contact: user.contact, 
                userName: user.name, 
                category: suggestionCategory, 
                message: suggestionMessage.trim() 
            })
        });

        const data = await response.json();
        if (data.success) {
            Alert.alert("આભાર", "તમારું સૂચન અમને મળી ગયું છે. અમે તેના પર જલ્દી વિચાર કરીશું!");
            setIsSuggestionVisible(false);
            setSuggestionMessage('');
        } else {
            Alert.alert("Error", data.error || "Failed to submit suggestion");
        }
    } catch (error) {
        Alert.alert("Error", "Server connection failed: " + error.message);
    } finally {
        setIsSendingSuggestion(false);
    }
  };

  const handleRateApp = async (rating) => {
    if (!user) {
        Alert.alert("લોગિન જરૂરી છે", "રેટિંગ આપવા માટે મહેરબાની કરીને લોગિન કરો.");
        setIsRatingVisible(false);
        return;
    }

    try {
        const rateUrl = API_URL.replace('temples', 'rate-app');
        const response = await fetch(rateUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
            body: JSON.stringify({ contact: user.contact, rating })
        });

        const data = await response.json();
        if (data.success) {
            setUser(data.user);
            Alert.alert("આભાર", "તમારા રેટિંગ બદલ આભાર!");
            setIsRatingVisible(false);
        } else {
            Alert.alert("Error", data.error || "Failed to save rating");
        }
    } catch (error) {
        Alert.alert("Error", "Server connection failed: " + error.message);
    }
  };

  const fetchAdminSuggestions = async () => {
    setIsAdminLoading(true);
    try {
        const url = API_URL.replace('temples', 'admin/suggestions');
        const response = await fetch(url, { headers: { 'ngrok-skip-browser-warning': 'true' } });
        const data = await response.json();
        if (Array.isArray(data)) {
            setAdminSuggestions(data);
        } else {
            setAdminSuggestions([]);
        }
    } catch (e) { 
        console.error(e);
        setAdminSuggestions([]);
    }
    finally { setIsAdminLoading(false); }
  };

  const fetchAdminRatings = async () => {
    setIsAdminLoading(true);
    try {
        const url = API_URL.replace('temples', 'admin/ratings');
        const response = await fetch(url, { headers: { 'ngrok-skip-browser-warning': 'true' } });
        const data = await response.json();
        if (Array.isArray(data)) {
            setAdminRatings(data);
        } else {
            setAdminRatings([]);
        }
    } catch (e) { 
        console.error(e);
        setAdminRatings([]);
    }
    finally { setIsAdminLoading(false); }
  };

  const fetchAdminGuides = async () => {
    setIsAdminLoading(true);
    try {
        const url = API_URL.replace('temples', 'admin/guides');
        const response = await fetch(url, { headers: { 'ngrok-skip-browser-warning': 'true' } });
        const data = await response.json();
        if (Array.isArray(data)) {
            setAdminGuides(data);
        } else {
            setAdminGuides([]);
        }
    } catch (e) { 
        console.error(e);
        setAdminGuides([]);
    }
    finally { setIsAdminLoading(false); }
  };

  const handleVerifyGuide = async (id, isVerified) => {
    try {
        const url = API_URL.replace('temples', 'admin/verify-guide');
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
            body: JSON.stringify({ id, isVerified })
        });
        const data = await response.json();
        if (data.success) {
            Alert.alert("Success", `Guide ${isVerified ? 'Verified' : 'Unverified'} Successfully!`);
            fetchAdminGuides();
        }
    } catch (e) {
        Alert.alert("Error", "Failed to update verify status");
    }
  };

  const handleTwilioCall = async (guideContact, guideName) => {
    if (!user || (!user.contact && !user.mobile && !user.phoneNumber)) {
        Alert.alert("Profile Error", "Your profile is missing a contact number. Please update your profile.");
        return;
    }
    
    // Normalize user contact (Prefer explicit phoneNumber, else fallback to contact/mobile)
    const adminContact = user.phoneNumber || user.mobile || user.contact; 
    
    Alert.alert(
        "Connect Call",
        `Use Twilio Safe-Call to connect with ${guideName}?\n\nOur system will call YOU (${adminContact}) first. Please answer to connect to the guide.`,
        [
            { text: "Cancel", style: "cancel" },
            { 
                text: "Call Now", 
                onPress: async () => {
                    setIsAdminLoading(true);
                    try {
                        const baseUrl = API_URL.replace('/api/temples', '');
                        const response = await fetch(`${baseUrl}/api/admin/call-guide`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                            body: JSON.stringify({ adminContact, guideContact })
                        });
                        const result = await response.json();
                        if (result.success) {
                            Alert.alert("Calling...", "We are dialing your number now. Please answer to connect.");
                        } else {
                            Alert.alert("Call Failed", result.error || "Unknown error");
                        }
                    } catch (error) {
                        Alert.alert("Error", "Network error initiating call. " + error.message);
                    } finally {
                        setIsAdminLoading(false);
                    }
                }
            }
        ]
    );
  };


  const handleAiGenerate = async () => {
    if (!newTemple.name) {
        Alert.alert("Error", "Please enter Temple Name first to generate content.");
        return;
    }

    setIsAiGenerating(true);
    try {
        const url = API_URL.replace('temples', 'admin/generate-ai-content');
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
            body: JSON.stringify({ name: newTemple.name, location: newTemple.location })
        });
        
        const data = await response.json();
        if (data.success) {
            setNewTemple(prev => ({
                ...prev,
                name: data.data.name_gu || prev.name,
                name_hi: data.data.name_hi,
                name_en: data.data.name_en,
                history: data.data.history,
                architecture: data.data.architecture,
                significance: data.data.significance,
                district: data.data.district || prev.district,
                bestTimeToVisit: data.data.bestTimeToVisit,
                howToReach: data.data.howToReach,
                nearbyAttractions: data.data.nearbyAttractions,
                history_en: data.data.history_en,
                history_hi: data.data.history_hi
            }));
            Alert.alert("AI Success", "Story and guide information generated successfully!");
        } else {
            Alert.alert("AI Error", data.error || "Failed to generate AI content");
        }
    } catch (e) {
        Alert.alert("Connection Error", "Could not reach AI server.");
    } finally {
        setIsAiGenerating(false);
    }
  };



  const fetchAdminUsers = async () => {
    try {
        const response = await fetch(`${API_URL.replace('temples', 'admin/users')}`, {
             headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        const data = await response.json();
        if (Array.isArray(data)) {
            // Filter out Main Admins (Show only Users and Sub Admins)
            const filtered = data.filter(u => u.role !== 'admin' && u.role !== 'main_admin');
            setAdminUsers(filtered);
        }
    } catch (error) {
        console.error("Fetch users error:", error);
    }
  };

  const handleEditUser = (user) => {
      setAdminRegisterData({
          id: user.id,
          name: user.name,
          contact: user.contact,
          phoneNumber: user.phoneNumber || '',
          password: '', // Leave blank if not changing
          role: user.role
      });
      // Scroll to top or just alert
      Alert.alert("Edit Mode", `Editing ${user.name}. Update details in the form above and click 'Update User'.`);
  };

  const handleDeleteUser = async (userId, userName) => {
      Alert.alert(
          "Delete User",
          `Are you sure you want to delete ${userName}?`,
          [
              { text: "Cancel", style: "cancel" },
              { 
                  text: "Delete", 
                  style: "destructive",
                  onPress: async () => {
                      try {
                          setIsAdminLoading(true);
                          const response = await fetch(`${API_URL.replace('temples', `admin/users/${userId}`)}`, {
                              method: 'DELETE',
                              headers: { 'ngrok-skip-browser-warning': 'true' }
                          });
                          const data = await response.json();
                          if (data.success) {
                              Alert.alert("Success", "User deleted successfully");
                              fetchAdminUsers(); // Refresh list
                          } else {
                              Alert.alert("Error", data.error || "Failed to delete");
                          }
                      } catch (error) {
                          Alert.alert("Error", "Connection failed");
                      } finally {
                          setIsAdminLoading(false);
                      }
                  }
              }
          ]
      );
  };

  const handleAdminRegister = async () => {
      const { id, name, contact, password, role, phoneNumber } = adminRegisterData;
      
      // Validation
      if (!name || !contact) {
          Alert.alert("Error", "Name and Contact are required");
          return;
      }
      if (!id && !password) { // Password required only for new users
           Alert.alert("Error", "Password is required for new users");
           return;
      }

      setIsAdminLoading(true);
      try {
          // Determine if creating or updating
          const url = id 
            ? `${API_URL.replace('temples', `admin/users/${id}`)}` 
            : `${API_URL.replace('temples', 'admin/register-user')}`;
          
          const method = id ? 'PUT' : 'POST';

          const response = await fetch(url, {
              method: method,
              headers: { 
                  'Content-Type': 'application/json',
                  'ngrok-skip-browser-warning': 'true' 
              },
              body: JSON.stringify(adminRegisterData)
          });

          const data = await response.json();
          if (data.success) {
              Alert.alert("Success", id ? `Updated ${name} successfully!` : `Registered ${name} successfully!`);
              setAdminRegisterData({ id: null, name: '', contact: '', phoneNumber: '', password: '', role: 'user' });
              fetchAdminUsers(); // Refresh list
          } else {
              Alert.alert("Error", data.error || "Operation failed");
          }
      } catch (error) {
          Alert.alert("Error", "Server connection failed: " + error.message);
      } finally {
          setIsAdminLoading(false);
      }
  };

  const handleAddTemple = async () => {
    // Validation: Name is required.
    // Video Source: Either basic VideoId OR Channel URL is required.
    if (!newTemple.name) {
        Alert.alert("Error", "Temple Name is required");
        return;
    }
    if (!newTemple.liveVideoId && !newTemple.liveChannelUrl) {
         Alert.alert("Error", "Please provide either a YouTube Video ID OR a Live Channel URL");
         return;
    }
    // Default video ID if only channel URL is provided
    let finalTempleData = { ...newTemple };
    if (newTemple.liveChannelUrl && !newTemple.liveVideoId) {
        finalTempleData.liveVideoId = "PRE-RECORDED_VIDEO_ID"; 
    }

    setIsAdminLoading(true);
    try {
        const isUpdate = !!newTemple.id;
        const url = API_URL.replace('temples', isUpdate ? 'admin/update-temple' : 'admin/add-temple');
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
            body: JSON.stringify(finalTempleData)
        });
        const data = await response.json();
        
        if (data.success) {
            Alert.alert("Success", isUpdate ? "Temple updated successfully!" : "Temple added successfully!");
            
            // If this was from a suggestion, update its status (Only for new adds usually)
            if (!isUpdate && newTemple.suggestionId) {
                try {
                    const statusUrl = API_URL.replace('temples', 'admin/update-suggestion-status');
                    await fetch(statusUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                        body: JSON.stringify({ id: newTemple.suggestionId, status: 'Added' })
                    });
                    fetchAdminSuggestions(); // Refresh list to show updated status
                } catch (err) { console.log("Status update failed", err); }
            }

            // Reset Form on Success
            setNewTemple({ 
                state: 'ગુજરાત', name: '', description: '', liveVideoId: '', location: '', history: '',
                architecture: '', significance: '', bestTimeToVisit: '', howToReach: '', nearbyAttractions: '',
                history_en: '', history_hi: '', suggestionId: null, liveChannelUrl: ''
            });
            // If we were editing, maybe close tab or something? App logic stays on tab but clears form.
             if (isUpdate) {
                 // Optionally switch back to 'manage' tab
                 setActiveAdminTab('manage');
             }

        } else {
            Alert.alert("Error", data.error || "Operation failed");
        }
    } catch (e) { Alert.alert("Error", "Network request failed"); }
    finally { setIsAdminLoading(false); fetchTemples(); }
  };

  const handleDeleteTemple = async (temple) => {
    Alert.alert(
        "Confirm Delete",
        `Are you sure you want to delete ${temple.name.split('–')[0]}? This cannot be undone.`,
        [
            { text: "Cancel", style: "cancel" },
            { 
                text: "Delete", 
                style: "destructive",
                onPress: async () => {
                    setIsAdminLoading(true);
                    try {
                        const url = API_URL.replace('temples', 'admin/delete-temple');
                        const response = await fetch(url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                            body: JSON.stringify({ id: temple.id, name: temple.name })
                        });
                        const data = await response.json();
                        if (data.success) {
                            Alert.alert("Deleted", "Temple removed successfully!");
                            fetchTemples(); // Refresh the list
                        }
                    } catch (e) { Alert.alert("Error", "Failed to delete temple"); }
                    finally { setIsAdminLoading(false); }
                }
            }
        ]
    );
  };

  const handleDirectDonate = async () => {
    const upiId = '6353455902@ptsbi';
    const name = 'NIKUNJ PANDYA';
    const note = 'Donation for Divya Darshan';
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&tn=${encodeURIComponent(note)}&cu=INR`;

    try {
        const supported = await Linking.canOpenURL(upiUrl);
        if (supported) {
            await Linking.openURL(upiUrl);
        } else {
            Alert.alert(
                "UPI App Not Found",
                "તમારા ફોનમાં કોઈ UPI એપ (Google Pay, PhonePe, Paytm) મળી નથી. મહેરબાની કરીને UPI ID કોપી કરીને તમારી એપ દ્વારા પેમેન્ટ કરો."
            );
        }
    } catch (error) {
        Alert.alert("Error", "Could not open UPI apps");
    }
  };

  const handleAdminPanelPress = () => {
    setIsMenuVisible(false);
    setIsAdminVisible(true);
    fetchAdminSuggestions();
  };
  const toggleSpeech = (text) => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      Speech.speak(text, {
        language: language === 'gu' ? 'gu-IN' : language === 'hi' ? 'hi-IN' : 'en-US',
        onDone: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }
  };

  const handleGetCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "Please allow location access to use this feature.");
        return;
      }

      setIsJourneyLoading(true);
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      // Reverse geocode to get exact full address like Google Maps
      let reverseResult = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });

      if (reverseResult.length > 0) {
        const place = reverseResult[0];
        
        // Build detailed address like Google Maps
        let addressParts = [];
        
        // Add street/name if available
        if (place.name && place.name !== place.city) {
          addressParts.push(place.name);
        }
        
        // Add street address
        if (place.street) {
          addressParts.push(place.street);
        }
        
        // Add subregion/area
        if (place.subregion && place.subregion !== place.city) {
          addressParts.push(place.subregion);
        }
        
        // Add city
        if (place.city) {
          addressParts.push(place.city);
        } else if (place.district) {
          addressParts.push(place.district);
        }
        
        // Add region/state if city not available
        if (!place.city && place.region) {
          addressParts.push(place.region);
        }
        
        // Create full address string
        const fullAddress = addressParts.length > 0 
          ? addressParts.join(', ')
          : `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`;
        
        setJourneyOrigin(fullAddress);
        
        // Show success message with exact location
        Alert.alert(
          "📍 Location Found", 
          `Your current location:\n${fullAddress}`,
          [{ text: "OK" }]
        );
      } else {
        // Fallback to coordinates
        const coords = `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`;
        setJourneyOrigin(coords);
        Alert.alert("Location Found", `Using GPS coordinates:\n${coords}`);
      }
    } catch (error) {
      Alert.alert("Error", "Could not fetch location. Please enter manually.");
      console.log(error);
    } finally {
      setIsJourneyLoading(false);
    }
  };

  const handleGenerateJourney = async () => {
    if (!journeyOrigin.trim() || !journeyDestination.trim()) {
      Alert.alert("Error", "Please enter origin and destination");
      return;
    }
    setIsJourneyLoading(true);
    setJourneySteps([]);
    try {
      const url = API_URL.replace('temples', 'generate-journey-guide');
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ 
          origin: journeyOrigin, 
          destination: journeyDestination, 
          lang: language,
          travelMode: travelMode 
        })
      });
      const data = await response.json();
      if (data.success) {
        setJourneySteps(data.journey);
        setJourneyTitle(data.title);
        setJourneyRoutePath(data.routePath || '');
        setJourneyDistance(data.distance);
        setJourneyEstimatedTime(data.estimatedTime || 'Calculating...');
      } else {
        Alert.alert("Error", data.error || "Failed to generate guide");
      }
    } catch (e) {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setIsJourneyLoading(false);
    }
  };  const handleAutoTranslate = async () => {
    if (!selectedTemple) return;
    
    setIsTranslating(true);
    try {
        const url = API_URL.replace('temples', 'translate');
        const updatedTemple = { ...selectedTemple };
        
        // Define all fields to check
        const fieldsToCheck = [
            'history', 'architecture', 'significance', 'bestTimeToVisit', 
            'howToReach', 'nearbyAttractions', 'description', 'location'
        ];
        
        // 1. Identify which fields actually need translation
        const fieldsToTranslate = {};
        
        for (const key of fieldsToCheck) {
            const originalContent = selectedTemple[key];
            const targetKey = `${key}_${language}`;
            // If original exists AND translation is missing
            if (originalContent && !updatedTemple[targetKey]) {
                fieldsToTranslate[key] = originalContent;
            }
        }

        // Check temple Name
        const nameTargetKey = `name_${language}`;
        if (!updatedTemple[nameTargetKey] && (language === 'hi' || language === 'en')) {
             fieldsToTranslate['name'] = selectedTemple.name.split('–')[0];
        }

        const keysToTranslate = Object.keys(fieldsToTranslate);

        if (keysToTranslate.length === 0) {
            // Nothing to do
            setIsTranslating(false);
            return;
        }

        console.log("Bulk translating:", keysToTranslate);

        // 2. Create a single bulk payload
        // We will send a JSON object where keys are the field names and values are texts
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                body: JSON.stringify({ 
                    bulk: true, // Flag for server
                    contentMap: fieldsToTranslate, 
                    targetLang: language 
                })
            });
            const data = await response.json();
            
            if (data.success && data.translatedMap) {
                // 3. Update all fields from response
                keysToTranslate.forEach(key => {
                    const translatedText = data.translatedMap[key];
                    if (translatedText) {
                         // Special case for 'name' which doesn't directly map to name_lang in the same loop way usually
                         if (key === 'name') {
                             updatedTemple[nameTargetKey] = translatedText;
                         } else {
                             updatedTemple[`${key}_${language}`] = translatedText;
                         }
                    }
                });
                setSelectedTemple(updatedTemple);
                // Alert.alert("Success", "Translation Complete!"); 
            } else {
                console.log("Bulk translation partial/failed:", data);
                if (data.error) throw new Error(data.error);
            }

        } catch (err) {
            console.log(`Failed to bulk translate`, err);
            Alert.alert("Translation Error", err.message || "Server limit reached. Try again later.");
        }

    } catch (error) {
        Alert.alert("Error", "System error: " + error.message);
    } finally {
        setIsTranslating(false);
    }
  };

  const handleApplySuggestion = (suggestion) => {
    setNewTemple({
        state: 'ગુજરાત',
        name: suggestion.message,
        location: '',
        description: '',
        liveVideoId: '',
        history: '',
        architecture: '',
        significance: '',
        bestTimeToVisit: '',
        howToReach: '',
        nearbyAttractions: '',
        history_en: '',
        history_hi: '',
        suggestionId: suggestion.id,
        liveChannelUrl: ''
    });
    setActiveAdminTab('addTemple');
    Alert.alert("Form Pre-filled", "Temple name has been set. Use '✨ Generate' to auto-complete the rest!");
  };
  async function registerForPushNotificationsAsync() {
    try {
      if (!Device.isDevice) {
        console.log('Must use physical device for Push Notifications');
        return;
      }
      
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }

      // In Expo SDK 53+, remote notifications don't work in Expo Go.
      // We wrap this in try-catch to prevent the app from crashing.
      try {
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        console.log("Push Token:", token);
      } catch (tokenError) {
        console.log("Remote notifications not supported in this environment (likely Expo Go SDK 53+). Local notifications will still work.");
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('aarti-channel', {
          name: 'Aarti Reminders',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF9933',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          showBadge: true,
        });
      }
    } catch (error) {
      console.log('Error setting up notifications:', error);
    }
  }

  const toggleReminder = async (temple) => {
    const templeName = temple.name;
    if (reminders.includes(templeName)) {
      setReminders(prev => prev.filter(t => t !== templeName));
      await Notifications.cancelAllScheduledNotificationsAsync(); 
      Alert.alert("Reminder Removed", `You will no longer receive notifications for ${templeName} Aarti.`);
    } else {
      setReminders(prev => [...prev, templeName]);
      
      try {
          // Priority 1: Temple's dynamic timings
          // Priority 2: Default static fallback
          let timings = [];
          
          if (temple.aartiTimings) {
              try {
                  // If it's a string (from TextInput), try to parse it. 
                  // If it's already an object (from DB), use it.
                  timings = typeof temple.aartiTimings === 'string' ? JSON.parse(temple.aartiTimings) : temple.aartiTimings;
              } catch (pe) {
                  console.log("Failed to parse timings, using default", pe);
              }
          }
          
          if (!timings || timings.length === 0) {
              timings = [{ h: 7, m: 0, label: "સવારની આરતી" }, { h: 19, m: 0, label: "સાંજની આરતી" }];
          }
          
          let scheduleInfo = "";
          for (const time of timings) {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: `🕉️ ${time.label}: ${templeName.split('–')[0].trim()}`,
                  body: `જય હો! ${templeName.split('–')[0].trim()} માં ${time.label} નો સમય થયો છે. દિવ્ય દર્શન કરો.`,
                  sound: true,
                  channelId: 'aarti-channel',
                },
                trigger: { 
                  hour: parseInt(time.h),
                  minute: parseInt(time.m),
                  repeats: true,
                  channelId: 'aarti-channel'
                },
              });
              scheduleInfo += `\n• ${time.label}: ${time.h}:${time.m < 10 ? '0'+time.m : time.m}`;
          }

          Alert.alert(
            "આરતી રિમાઇન્ડર સેટ!", 
            `${templeName} માટે નીચે મુજબ સમય સેટ કરવામાં આવ્યો છે:${scheduleInfo}`
          );
      } catch (err) {
          Alert.alert("Notification Error", err.message);
      }
    }
  };

  const sendInstantNotification = async () => {
    try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "🚀 Instant Test",
            body: "અભિનંદન! નોટિફિકેશન સિસ્ટમ બરાબર કામ કરી રહી છે.",
            sound: true,
            channelId: 'aarti-channel',
          },
          trigger: null, 
        });
        setIsMenuVisible(false);
    } catch (err) {
        Alert.alert("Notification Error", err.message);
    }
  };

  const handleLogin = (userData) => {
      setUser(userData);
      setIsLoggedIn(true);
  };

  const handleLogout = () => {
      Alert.alert(
        "Logout",
        "Are you sure you want to logout?",
        [
            { text: "Cancel", style: "cancel" },
            { 
                text: "Logout", 
                style: "destructive", 
                onPress: () => {
                    setUser(null);
                    setIsLoggedIn(false);
                    setIsProfileVisible(false);
                    setIsMenuVisible(false);
                }
            }
        ]
      );
  };

  const handleProfilePress = () => {
      setIsMenuVisible(false);
      if (user) {
          setEditName(user.name);
          setEditPhone(user.phoneNumber || '');
          setIsProfileVisible(true);
      } else {
          Alert.alert(
              "લોગિન જરૂરી છે",
              "તમારે તમારી પ્રોફાઈલ જોવા માટે લોગિન કરવું પડશે. શું તમે અત્યારે લોગિન કરવા માંગો છો?",
              [
                  { text: "ના", style: "cancel" },
                  { 
                      text: "હા, લોગિન કરો", 
                      onPress: () => setIsLoggedIn(false) 
                  }
              ]
          );
      }
  };

  const handleShareApp = async () => {
    try {
      const appUrl = 'https://play.google.com/store/apps/details?id=com.divyadarshan.live'; 
      const shareMessage = language === 'gu' 
        ? `અદભૂત દિવ્ય દર્શન અનુભવ માટે અત્યારે જ "દિવ્ય દર્શન" એપ ડાઉનલોડ કરો! 🙏✨\nડાઉનલોડ લિંક: ${appUrl}`
        : (language === 'hi' 
            ? `अदभुत दिव्य दर्शन अनुभव के लिए अभी "दिव्य दर्शन" ऐप डाउनलोड करें! 🙏✨\nडाउनलोड लिंक: ${appUrl}`
            : `Experience the divine with "Divya Darshan" app! Download now for live darshan and spiritual guides. 🙏✨\nDownload Link: ${appUrl}`);
            
      await Share.share({
        message: shareMessage,
        url: Platform.OS === 'ios' ? appUrl : undefined,
        title: 'Divya Darshan App'
      });
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const handleShareTemple = async (temple) => {
    try {
      const appUrl = 'https://play.google.com/store/apps/details?id=com.divyadarshan.live'; 
      const templeName = getTempleTranslation(temple, 'name', language);
      const shareMessage = language === 'gu' 
        ? `"${templeName}" ના લાઈવ દર્શન અત્યારે જ "દિવ્ય દર્શન" એપ પર જુઓ! 🙏✨\n\nડાઉનલોડ લિંક: ${appUrl}`
        : (language === 'hi' 
            ? `"${templeName}" के लाइव दर्शन अभी "दिव्य दर्शन" ऐप પર देखें! 🙏✨\n\nडाउनलोड લિંક: ${appUrl}`
            : `Watch Live Darshan of "${templeName}" on "Divya Darshan" app! 🙏✨\n\nDownload Link: ${appUrl}`);
            
      await Share.share({
        message: shareMessage,
        url: Platform.OS === 'ios' ? appUrl : undefined,
        title: templeName
      });
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const fetchData = async () => {
    try {
      // Try to fetch with a short timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); 

      const response = await fetch(API_URL, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('Network response was not ok');

      const json = await response.json();
      console.log('Fetched Data Success. Live statuses from server included.');
      setTempleData(json);
      setIsOffline(false);
    } catch (error) {
      console.log('Fetch failed:', error.message);
      setTempleData([]);
      setIsOffline(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Direct YouTube Check (Client-Side Fallback)
  const checkYouTubeDirectly = async (channelUrl) => {
      try {
          console.log("Attempting direct YouTube check for:", channelUrl);
          const response = await fetch(channelUrl, {
              headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
              }
          });
          const text = await response.text();
          
          const isLive = text.includes('isLive":true') || text.includes('"status":"LIVE"');
          
          let videoId = null;
          const videoIdMatch = text.match(/"videoId":"([^"]+)"/);
          const canonicalMatch = text.match(/link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([^"]+)"/);

          if (videoIdMatch) videoId = videoIdMatch[1];
          else if (canonicalMatch) videoId = canonicalMatch[1];

          if (isLive && videoId) {
              return videoId;
          }
      } catch (e) {
          console.log("Direct YouTube check failed", e);
      }
      return null;
  };

  // Check Live Status for specific temple
  const checkLiveStatus = async (temple) => {
    if (temple.liveChannelUrl) {
        if (!temple.liveVideoId || temple.liveVideoId === "PRE-RECORDED_VIDEO_ID") {
             setIsCheckingLive(true);
        }
        
        try {
            // Priority 1: Backend API
            const baseUrl = API_URL.includes('/api/temples') ? API_URL.replace('/api/temples', '') : API_URL;
            const response = await fetch(`${baseUrl}/api/live-check?channelUrl=${encodeURIComponent(temple.liveChannelUrl)}`);
            const data = await response.json();
            
            if (data.videoId && data.videoId !== "PRE-RECORDED_VIDEO_ID") {
                console.log(`(Backend) Live found for ${temple.name}: ${data.videoId}`);
                updateTempleLiveId(data.videoId);
                return;
            }
        } catch (e) {
            console.log("Backend Live check failed, trying direct...", e);
        }

        // Priority 2: Direct Client-Side Check
        const directVideoId = await checkYouTubeDirectly(temple.liveChannelUrl);
        if (directVideoId) {
            console.log(`(Direct) Live found for ${temple.name}: ${directVideoId}`);
            updateTempleLiveId(directVideoId);
        } else {
             setIsCheckingLive(false);
        }
    }
  };

  const updateTempleLiveId = (videoId) => {
    setSelectedTemple(prev => {
        if (!prev) return null;
        return { ...prev, liveVideoId: videoId };
    });
    setIsCheckingLive(false);
  };

  useEffect(() => {
    console.log("App mounted. Using API:", API_URL);
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedTemple) {
        setPlaying(true);
        // Trigger live check if it's the live temple
        checkLiveStatus(selectedTemple);
    }
    // Stop speech when switching/closing
    Speech.stop();
    setIsSpeaking(false);
  }, [selectedTemple?.name]);

  const onStateChange = useCallback((state) => {
    if (state === "ended") {
      setPlaying(false);
    }
  }, []);

  // Back handler
  const handleBack = async () => {
      if (isFullScreen) {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
          setIsFullScreen(false);
      } else {
        setPlaying(false);
        setSelectedTemple(null);
        setIsCheckingLive(false);
      }
  };
  
  const toggleFullScreen = async () => {
    if (!isFullScreen) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      setIsFullScreen(true);
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      setIsFullScreen(false);
    }
  };

  if (!isLoggedIn) {
      return <AuthScreen onLogin={handleLogin} />;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9933" />
        <Text style={styles.loadingText}>Loading Temples...</Text>
      </View>
    );
  }
  
  const GuideAppointmentsView = () => {
    const pendingCount = guideAppointments.filter(a => a.status === 'pending').length;

    return (
        <Modal
            visible={isAppointmentsVisible}
            animationType="slide"
            onRequestClose={() => setIsAppointmentsVisible(false)}
        >
            <View style={styles.adminModalContainer}>
                <View style={styles.adminModalHeader}>
                    <Text style={styles.adminModalTitle}>Booking Requests ({pendingCount})</Text>
                    <TouchableOpacity onPress={() => setIsAppointmentsVisible(false)}>
                        <Text style={styles.adminCloseBtn}>✕</Text>
                    </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.adminScroll}>
                    {guideAppointments.length === 0 ? (
                        <View style={{padding: 40, alignItems: 'center'}}>
                            <Text style={{fontSize: 50}}>📭</Text>
                            <Text style={{fontSize: 18, color: '#666', marginTop: 10}}>No bookings yet</Text>
                        </View>
                    ) : (
                        guideAppointments.map((item) => (
                            <View key={item.id} style={[styles.suggestionItem, { borderLeftColor: item.status === 'pending' ? '#FF9933' : '#4CAF50' }]}>
                                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5}}>
                                    <Text style={{fontWeight: 'bold', fontSize: 16}}>{item.userName}</Text>
                                    <View style={[styles.statusBadge, { backgroundColor: item.status === 'pending' ? '#FFF3E0' : (item.status === 'accepted' ? '#E8F5E9' : '#FFEBEE') }]}>
                                        <Text style={{ fontSize: 10, color: item.status === 'pending' ? '#E65100' : (item.status === 'accepted' ? '#2E7D32' : '#C62828') }}>
                                            {item.status.toUpperCase()}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={{fontSize: 14, color: '#555', marginBottom: 5}}>📅 Date: {item.date}</Text>
                                <Text style={{fontSize: 14, color: '#555', marginBottom: 10}}>📞 Phone: {item.userContact}</Text>
                                
                                {item.status === 'pending' && (
                                    <View style={{flexDirection: 'row', justifyContent: 'flex-end'}}>
                                        <TouchableOpacity 
                                            style={[styles.smallBtn, {backgroundColor: '#f44336', marginRight: 10}]}
                                            onPress={() => handleUpdateAppointmentStatus(item.id, 'rejected')}
                                        >
                                            <Text style={{color: '#fff', fontWeight: 'bold'}}>Reject</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            style={[styles.smallBtn, {backgroundColor: '#4CAF50'}]}
                                            onPress={() => handleUpdateAppointmentStatus(item.id, 'accepted')}
                                        >
                                            <Text style={{color: '#fff', fontWeight: 'bold'}}>Accept</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        ))
                    )}
                </ScrollView>
            </View>
        </Modal>
    );
  };
  
  const UserBookingsView = () => {
    return (
        <Modal
            visible={isUserBookingsVisible}
            animationType="slide"
            onRequestClose={() => setIsUserBookingsVisible(false)}
        >
            <View style={styles.adminModalContainer}>
                <View style={styles.adminModalHeader}>
                    <Text style={styles.adminModalTitle}>My Guide Bookings</Text>
                    <TouchableOpacity onPress={() => setIsUserBookingsVisible(false)}>
                        <Text style={styles.adminCloseBtn}>✕</Text>
                    </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.adminScroll}>
                    {userAppointments.length === 0 ? (
                        <View style={{padding: 40, alignItems: 'center'}}>
                            <Text style={{fontSize: 50}}>🚩</Text>
                            <Text style={{fontSize: 18, color: '#666', marginTop: 10}}>No guides booked yet</Text>
                        </View>
                    ) : (
                        userAppointments.map((item) => (
                            <View key={item.id} style={[styles.suggestionItem, { borderLeftColor: item.status === 'pending' ? '#FF9933' : (item.status === 'accepted' ? '#4CAF50' : '#f44336') }]}>
                                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5}}>
                                    <Text style={{fontWeight: 'bold', fontSize: 16}}>{item.guideName || 'Local Guide'}</Text>
                                    <View style={[styles.statusBadge, { backgroundColor: item.status === 'pending' ? '#FFF3E0' : (item.status === 'accepted' ? '#E8F5E9' : '#FFEBEE') }]}>
                                        <Text style={{ fontSize: 10, color: item.status === 'pending' ? '#E65100' : (item.status === 'accepted' ? '#2E7D32' : '#C62828') }}>
                                            {item.status.toUpperCase()}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={{fontSize: 14, color: '#555', marginBottom: 5}}>📅 Date: {item.date}</Text>
                                <Text style={{fontSize: 14, color: '#555', marginBottom: 10}}>📞 Guide Phone: {item.guideContact}</Text>
                                
                                {item.status === 'accepted' && (
                                    <>
                                        <TouchableOpacity 
                                            style={[styles.smallBtn, {backgroundColor: '#25D366', marginBottom: 8}]}
                                            onPress={() => Linking.openURL(`whatsapp://send?phone=${item.guideContact}&text=Hi, I booked you as a guide for ${item.date}`)}
                                        >
                                            <Text style={{color: '#fff', fontWeight: 'bold'}}>Chat on WhatsApp</Text>
                                        </TouchableOpacity>
                                        
                                        {!reviewedAppointments.has(item.id) && (
                                            <TouchableOpacity 
                                                style={[styles.smallBtn, {backgroundColor: '#FF9933'}]}
                                                onPress={() => {
                                                    setSelectedAppointmentForReview(item);
                                                    setIsReviewModalVisible(true);
                                                }}
                                            >
                                                <Text style={{color: '#fff', fontWeight: 'bold'}}>⭐ Rate Guide</Text>
                                            </TouchableOpacity>
                                        )}
                                        
                                        {reviewedAppointments.has(item.id) && (
                                            <View style={[styles.smallBtn, {backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#4CAF50'}]}>
                                                <Text style={{color: '#2E7D32', fontWeight: 'bold'}}>✓ Reviewed</Text>
                                            </View>
                                        )}
                                    </>
                                )}
                            </View>
                        ))
                    )}
                </ScrollView>
            </View>
        </Modal>
    );
  };
  
  // const { width: windowWidth, height: windowHeight } = useWindowDimensions(); // MOVED UP


  return (
    <View style={styles.container}>
      {selectedTemple ? (
        <View style={{flex: 1}}>
            <StatusBar style="light" />
            
            {/* Header */}
            {!isFullScreen && (
            <LinearGradient colors={['#FF9933', '#FF512F']} style={styles.header}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <TouchableOpacity onPress={handleBack} style={{paddingRight: 15}}>
                        <Text style={[styles.backButtonText, {fontSize: 22}]}>←</Text>
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, {textAlign: 'left', flex: 1, marginLeft: 5}]} numberOfLines={1}>
                        {language === 'hi' && selectedTemple.name_hi ? selectedTemple.name_hi :
                         language === 'en' && selectedTemple.name_en ? selectedTemple.name_en :
                         selectedTemple.name.split('–')[0].trim()}
                    </Text> 
                    <TouchableOpacity onPress={() => handleShareTemple(selectedTemple)} style={{paddingHorizontal: 10}}>
                        <Text style={{fontSize: 22}}>📤</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>
            )}

            <ScrollView contentContainerStyle={isFullScreen ? styles.fullScreenContainer : styles.detailContent} scrollEnabled={!isFullScreen}>
                {/* Video Section */}
                <View style={[styles.card, isFullScreen && styles.fullScreenCard]}>
                    <View style={[styles.videoContainer, isFullScreen && { height: windowHeight, width: windowWidth, backgroundColor: 'black' }]}>
                        {isCheckingLive ? (
                             <View style={styles.placeholderVideo}>
                                <ActivityIndicator size="large" color="#FF9933" />
                                <Text style={styles.placeholderSubText}>Checking Live Status...</Text>
                            </View>
                        ) : selectedTemple.liveVideoId && selectedTemple.liveVideoId !== "PRE-RECORDED_VIDEO_ID" ? (
                            <View style={isFullScreen ? { flex: 1, backgroundColor: 'black', justifyContent: 'center' } : {}}>
                                <YoutubePlayer
                                    height={isFullScreen ? windowHeight : 240}
                                    width={isFullScreen ? windowWidth : undefined}
                                    play={playing}
                                    videoId={selectedTemple.liveVideoId}
                                    onChangeState={onStateChange}
                                    initialPlayerParams={{
                                        controls: 0, 
                                        rel: 0, 
                                        showinfo: 0,
                                        modestbranding: 1,
                                        autoplay: 1,
                                        iv_load_policy: 3, 
                                        fs: 0 
                                    }}
                                    webViewStyle={isFullScreen ? { opacity: 0.99 } : {}} // Hack for some android rendering issues
                                />
                                {/* Full Screen Button Overlay */}
                                <TouchableOpacity 
                                    style={isFullScreen ? styles.minimizeButton : styles.fullScreenButton} 
                                    onPress={toggleFullScreen}
                                >
                                    <Text style={styles.fsButtonText}>{isFullScreen ? "Exit Full Screen" : "Full Screen"}</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.placeholderVideo}>
                                <Text style={styles.placeholderText}>Current Live Not Available</Text>
                                <Text style={styles.placeholderSubText}>Please check back later</Text>
                            </View>
                        )}
                    </View>
                    {/* Show Details only if not full screen */}
                    {!isFullScreen && (
                        <View style={styles.infoSection}>
                            <View style={styles.titleRow}>
                                <Text style={styles.title}>{selectedTemple.name}</Text>
                                {selectedTemple.liveVideoId && selectedTemple.liveVideoId !== "PRE-RECORDED_VIDEO_ID" && (
                                    <View style={styles.liveBadge}>
                                        <View style={styles.liveDot} />
                                        <Text style={styles.liveText}>LIVE</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.location}>
                                📍 {(language === 'en' && selectedTemple.location_en) ? selectedTemple.location_en :
                                   (language === 'hi' && selectedTemple.location_hi) ? selectedTemple.location_hi :
                                   selectedTemple.location}
                            </Text>
                            <Text style={styles.description}>
                                {(language === 'en' && selectedTemple.description_en) ? selectedTemple.description_en :
                                 (language === 'hi' && selectedTemple.description_hi) ? selectedTemple.description_hi :
                                 selectedTemple.description}
                            </Text>

                            {/* Local Guides Button */}
                            <TouchableOpacity 
                                style={styles.guidesBtn} 
                                onPress={() => {
                                    fetchGuidesByDistrict(selectedTemple.district);
                                    setIsGuidesModalVisible(true);
                                }}
                            >
                                <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.guidesBtnGradient}>
                                    <Text style={styles.guidesBtnText}>🚩 Find Local Guide For This temple</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {!isFullScreen && (
                    <>
                    {/* Additional Placeholder Info */}
                                        {/* Divine Guide Section */}
                    <View style={styles.card}>
                        <TouchableOpacity 
                            activeOpacity={0.9} 
                            onPress={() => setIsGuideExpanded(!isGuideExpanded)}
                        >
                            <LinearGradient colors={['#FF9933', '#FF512F']} style={styles.guideHeader}>
                                <View style={{flexDirection:'row', alignItems:'center', justifyContent:'space-between', width:'100%'}}>
                                    <View style={{flexDirection:'row', alignItems:'center'}}>
                                        <Text style={styles.guideHeaderEmoji}>🚩</Text>
                                        <Text style={styles.guideHeaderTitle}>
                                            {language === 'gu' ? 'દિવ્ય દર્શન માર્ગદર્શિકા' : (language === 'hi' ? 'दिव्य दर्शन मार्गदर्शिका' : 'Divine Guide')}
                                        </Text>
                                    </View>
                                    <Text style={{color:'#fff', fontSize:20, fontWeight:'bold'}}>{isGuideExpanded ? '▲' : '▼'}</Text>
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>

                        {isGuideExpanded && (
                        <>
                            <View style={styles.langContainer}>
                                {['gu', 'hi', 'en'].map(l => (
                                    <TouchableOpacity key={l} onPress={() => setLanguage(l)} style={[styles.langButton, language === l && styles.langButtonActive]}>
                                        <Text style={[styles.langText, language === l && styles.langTextActive]}>{l === 'gu' ? 'ગુજરાતી' : l === 'hi' ? 'हिंदी' : 'English'}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={{paddingHorizontal: 15, marginBottom: 15}}>
                                <TouchableOpacity 
                                    style={[styles.audioBtn, isSpeaking && styles.audioBtnActive, {width: '100%'}]} 
                                    onPress={() => {
                                        const textToSpeak = (language === 'en' && selectedTemple.history_en) ? selectedTemple.history_en :
                                                          (language === 'hi' && selectedTemple.history_hi) ? selectedTemple.history_hi :
                                                          (selectedTemple.history || "No story available");
                                        toggleSpeech(textToSpeak);
                                    }}
                                >
                                    <LinearGradient
                                        colors={isSpeaking ? ['#ef4444', '#b91c1c'] : ['#4f46e5', '#3730a3']}
                                        style={[styles.audioGradient, {borderRadius: 12}]}
                                    >
                                        <Text style={styles.audioBtnText}>
                                            {isSpeaking 
                                                ? (language === 'gu' ? '🛑 વર્ણન રોકો' : (language === 'hi' ? '🛑 वर्णन रोकें' : '🛑 Stop Guide'))
                                                : (language === 'gu' ? '🔊 વર્ણન સાંભળો' : (language === 'hi' ? '🔊 वर्णन सुनें' : '🔊 Play Guide'))
                                            }
                                        </Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.guideContent}>
                                {/* Global Translate Button */}
                                {needsTranslation(selectedTemple, language) && (
                                    <TouchableOpacity 
                                        style={{marginBottom: 15, backgroundColor: '#FFF7ED', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#FDBA74', flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}
                                        onPress={handleAutoTranslate}
                                        disabled={isTranslating}
                                    >
                                        <Text style={{fontSize: 20, marginRight: 8}}>✨</Text>
                                        <View>
                                            <Text style={{fontSize: 14, fontWeight: 'bold', color: '#C2410C'}}>
                                                {isTranslating ? "Translating..." : `Complete ${language === 'hi' ? 'Hindi' : 'English'} Translation`}
                                            </Text>
                                            <Text style={{fontSize: 11, color: '#EA580C'}}>Tap to translate missing sections</Text>
                                        </View>
                                    </TouchableOpacity>
                                )}

                                {/* History Section */}
                                <View style={styles.guideSection}>
                                    <Text style={styles.guideSectionTitle}>📜 {getTranslation('history', language)}</Text>
                                    <Text style={styles.guideText}>
                                        {getTempleTranslation(selectedTemple, 'history', language)}
                                    </Text>
                                    

                                </View>

                                {/* Architecture */}
                                <View style={styles.guideSection}>
                                    <Text style={styles.guideSectionTitle}>🏛️ {getTranslation('architecture', language)}</Text>
                                    <Text style={styles.guideText}>
                                        {getTempleTranslation(selectedTemple, 'architecture', language)}
                                    </Text>
                                </View>

                                {/* Significance */}
                                <View style={styles.guideSection}>
                                    <Text style={styles.guideSectionTitle}>✨ {getTranslation('significance', language)}</Text>
                                    <Text style={styles.guideText}>
                                        {getTempleTranslation(selectedTemple, 'significance', language)}
                                    </Text>
                                </View>

                                {/* Visit Info */}
                                <View style={styles.guideSection}>
                                    <Text style={styles.guideSectionTitle}>🗺️ {language === 'gu' ? 'મુલાકાત ટિપ્સ' : (language === 'hi' ? 'यात्रा जानकारी' : 'Travel Info')}</Text>
                                    <Text style={styles.guideText}>
                                        <Text style={{fontWeight:'bold'}}>{language === 'gu' ? 'શ્રેષ્ઠ સમય:' : (language === 'hi' ? 'सर्वश्रेष्ठ समय:' : 'Best Time:')}</Text> {getTempleTranslation(selectedTemple, 'bestTimeToVisit', language)}
                                    </Text>
                                    <Text style={styles.guideText}>
                                        <Text style={{fontWeight:'bold'}}>{language === 'gu' ? 'કેવી રીતે પહોંચવું:' : (language === 'hi' ? 'कैसे पहुँचें:' : 'How to reach:')}</Text> {getTempleTranslation(selectedTemple, 'howToReach', language)}
                                    </Text>
                                </View>

                                {/* Nearby */}
                                {selectedTemple.nearbyAttractions && (
                                    <View style={styles.guideSection}>
                                        <Text style={styles.guideSectionTitle}>🏞️ {language === 'gu' ? 'જોવાલાયક નજીકના સ્થળો' : (language === 'hi' ? 'आसपास के आकर्षण' : 'Nearby Attractions')}</Text>
                                        <Text style={styles.guideText}>
                                            {getTempleTranslation(selectedTemple, 'nearbyAttractions', language)}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </>
                        )}
                    </View>
                </>
                )}
            </ScrollView>
        </View>
      ) : (
        <View style={{flex: 1}}>
      <StatusBar style="light" />
      <LinearGradient colors={['#FF9933', '#FF512F']} style={styles.header}>
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
            <TouchableOpacity style={styles.menuButton} onPress={() => setIsMenuVisible(true)}>
                <Text style={styles.menuText}>☰</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{language === 'gu' ? 'દિવ્ય દર્શન' : (language === 'hi' ? 'दिव्य दर्शन' : 'Divya Darshan')}</Text>
            <View style={{width: 40}} /> 
        </View>
        
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10}}>
            <Text style={styles.headerSubtitle}>
                {language === 'gu' ? 'સ્વાગત છે,' : (language === 'hi' ? 'स्वागत है,' : 'Welcome,')} {user ? user.name : (language === 'gu' ? 'અતિથિ ભક્ત' : (language === 'hi' ? 'अतिथि भक्त' : 'Guest Devotee'))}
            </Text>
            
            <View style={styles.headerLangContainer}>
                {['gu', 'hi', 'en'].map(l => (
                    <TouchableOpacity 
                        key={l} 
                        onPress={() => setLanguage(l)}
                        style={[styles.headerLangBtn, language === l && styles.headerLangBtnActive]}
                    >
                        <Text style={[styles.headerLangText, language === l && styles.headerLangTextActive]}>
                            {l === 'gu' ? 'GU' : (l === 'hi' ? 'HI' : 'EN')}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF9933" />}
      >

        {templeData.map((stateGroup, stateIndex) => (
            <View key={stateIndex} style={styles.stateGroup}>
                <Text style={styles.stateTitle}>
                    {stateGroup.state === 'ગુજરાત' ? (language === 'hi' ? 'गुजरात' : (language === 'en' ? 'Gujarat' : 'ગુજરાત')) : stateGroup.state}
                </Text>

                {/* Robust Rendering: Handle both District-grouped (New) and flat (Old) data structures */}
                {stateGroup.districts ? (
                    stateGroup.districts.map((districtGroup, districtIndex) => (
                        <View key={districtIndex} style={styles.districtGroup}>
                             <View style={styles.districtHeader}>
                                <Text style={styles.districtTitle}>
                                    {language === 'gu' ? `📍 ${getDistrictTranslation(districtGroup.district, 'gu')} જિલ્લો` : (language === 'hi' ? `📍 ${getDistrictTranslation(districtGroup.district, 'hi')} ज़िला` : `📍 ${getDistrictTranslation(districtGroup.district, 'en')} District`)}
                                </Text>
                             </View>
                             
                             {districtGroup.temples && districtGroup.temples.map((temple, templeIndex) => (
                                <TouchableOpacity 
                                    key={templeIndex} 
                                    style={styles.templeRow}
                                    onPress={() => { setSelectedTemple({ ...temple, district: temple.district || districtGroup.district }); setIsGuideExpanded(false); }}
                                >
                                    <View style={styles.templeIcon}>
                                        <Text style={styles.templeIconText}>🕉️</Text>
                                    </View>
                                    <View style={styles.templeInfo}>
                                        <Text style={styles.templeName}>
                                            {getTempleTranslation(temple, 'name', language)}
                                        </Text>
                                        <Text style={styles.templeLocation}>{temple.location}</Text>
                                    </View>
                                    <View style={styles.rowActions}>
                                        <TouchableOpacity 
                                            style={styles.notifButton} 
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                toggleReminder(temple);
                                            }}
                                        >
                                            <Text style={[styles.notifIcon, reminders.includes(temple.name) && { color: '#FF9933' }]}>
                                                {reminders.includes(temple.name) ? "🔔" : "🔕"}
                                            </Text>
                                        </TouchableOpacity>
                                        <Text style={styles.arrow}>›</Text>
                                    </View>
                                </TouchableOpacity>
                             ))}
                        </View>
                    ))
                ) : (
                    // Fallback for old data structure (Safety Check)
                    stateGroup.temples && stateGroup.temples.map((temple, templeIndex) => (
                        <TouchableOpacity 
                            key={templeIndex} 
                            style={styles.templeRow}
                            onPress={() => { setSelectedTemple({ ...temple, district: temple.district || stateGroup.state }); setIsGuideExpanded(false); }}
                        >
                            <View style={styles.templeIcon}>
                                <Text style={styles.templeIconText}>🕉️</Text>
                            </View>
                            <View style={styles.templeInfo}>
                                <Text style={styles.templeName}>
                                    {getTempleTranslation(temple, 'name', language)}
                                </Text>
                                <Text style={styles.templeLocation}>{temple.location}</Text>
                            </View>
                            <View style={styles.rowActions}>
                                <TouchableOpacity 
                                    style={styles.notifButton} 
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        toggleReminder(temple);
                                    }}
                                >
                                    <Text style={[styles.notifIcon, reminders.includes(temple.name) && { color: '#FF9933' }]}>
                                        {reminders.includes(temple.name) ? "🔔" : "🔕"}
                                    </Text>
                                </TouchableOpacity>
                                <Text style={styles.arrow}>›</Text>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </View>
        ))}
         <View style={styles.footer}>
            <Text style={styles.footerText}>Made with ❤️ for Devotees</Text>
            <Text style={styles.footerText}>v1.1 (LAN Mode)</Text>
         </View>
      </ScrollView>
        </View>
      )}

      {/* CUSTOM SIDE MENU MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isMenuVisible}
        onRequestClose={() => setIsMenuVisible(false)}
      >
        <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalBackdrop} onPress={() => setIsMenuVisible(false)} />
            <View style={styles.menuContainer}>
                <LinearGradient colors={['#FF9933', '#FF512F']} style={styles.menuHeader}>
                    <Text style={styles.menuHeaderTitle}>Divya Darshan</Text>
                    <Text style={styles.menuHeaderSubtitle}>{user ? `Hi, ${user.name}` : "Welcome, Devotee"}</Text>
                </LinearGradient>
                
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                    <View style={styles.menuItems}>
                        <TouchableOpacity style={styles.menuItem} onPress={handleProfilePress}>
                            <Text style={styles.menuIcon}>👤</Text>
                            <Text style={styles.menuLabel}>My Profile</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMenuVisible(false); setIsJourneyVisible(true); }}>
                            <Text style={styles.menuIcon}>🛤️</Text>
                            <Text style={styles.menuLabel}>Spiritual Journey</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMenuVisible(false); setIsAboutVisible(true); }}>
                            <Text style={styles.menuIcon}>ℹ️</Text>
                            <Text style={styles.menuLabel}>About Us</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMenuVisible(false); handleShareApp(); }}>
                            <Text style={styles.menuIcon}>📤</Text>
                            <Text style={styles.menuLabel}>Share App</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMenuVisible(false); setIsDonationVisible(true); }}>
                            <Text style={styles.menuIcon}>🙏</Text>
                            <Text style={styles.menuLabel}>Donation</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMenuVisible(false); setIsSuggestionVisible(true); }}>
                            <Text style={styles.menuIcon}>💡</Text>
                            <Text style={styles.menuLabel}>Suggestions</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMenuVisible(false); setGuideFormData({...guideFormData, name: user?.name || '', contact: user?.contact || ''}); setIsGuideRegVisible(true); }}>
                            <Text style={styles.menuIcon}>🚩</Text>
                            <Text style={styles.menuLabel}>Become a Guide</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMenuVisible(false); setIsRatingVisible(true); setTempRating(user?.rating || 0); }}>
                            <Text style={styles.menuIcon}>⭐</Text>
                            <Text style={styles.menuLabel}>Rate Us</Text>
                        </TouchableOpacity>

                        {user?.role === 'admin' && (
                            <TouchableOpacity style={[styles.menuItem, {backgroundColor: '#FFF5E6'}]} onPress={handleAdminPanelPress}>
                                <Text style={styles.menuIcon}>🛠️</Text>
                                <Text style={[styles.menuLabel, {color: '#D35400', fontWeight: 'bold'}]}>Admin Panel</Text>
                            </TouchableOpacity>
                        )}

                        {/* Logout at the end */}
                        <TouchableOpacity style={[styles.menuItem, styles.menuItemLogout]} onPress={() => { setIsMenuVisible(false); handleLogout(); }}>
                            <Text style={[styles.menuIcon, styles.menuIconLogout]}>🚪</Text>
                            <Text style={[styles.menuLabel, styles.menuLabelLogout]}>Logout</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
                
                <View style={styles.menuFooter}>
                    <Text style={styles.menuFooterText}>Version 1.2.0</Text>
                </View>
            </View>
        </View>
      </Modal>

      {/* RATE US MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isRatingVisible}
        onRequestClose={() => setIsRatingVisible(false)}
      >
        <View style={styles.centerModalOverlay}>
            <View style={styles.ratingCard}>
                <LinearGradient colors={['#FF9933', '#FF512F']} style={styles.ratingHeader}>
                    <Text style={styles.ratingEmoji}>⭐</Text>
                    <Text style={styles.ratingTitle}>Rate Our App</Text>
                </LinearGradient>
                <View style={styles.ratingContent}>
                    <Text style={styles.ratingText}>અમારી એપ તમને કેવી લાગી? મહેરબાની કરીને તમારો અનુભવ શેર કરો.</Text>
                    <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity key={star} onPress={() => setTempRating(star)}>
                                <Text style={[styles.starIcon, tempRating >= star && { color: '#FFD700' }]}>
                                    {tempRating >= star ? "★" : "☆"}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TouchableOpacity 
                        style={styles.premiumUpdateBtn} 
                        onPress={() => handleRateApp(tempRating)}
                    >
                        <Text style={styles.updateBtnText}>Submit Rating</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.ratingCloseBtn} onPress={() => setIsRatingVisible(false)}>
                        <Text style={styles.ratingCloseText}>Maybe Later</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

      {/* SUGGESTION MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isSuggestionVisible}
        onRequestClose={() => setIsSuggestionVisible(false)}
      >
        <View style={styles.centerModalOverlay}>
            <View style={styles.suggestionCard}>
                <LinearGradient colors={['#FF9933', '#FF512F']} style={styles.suggestionHeader}>
                    <Text style={styles.suggestionEmoji}>💡</Text>
                    <Text style={styles.suggestionTitle}>Give Suggestion</Text>
                </LinearGradient>
                <ScrollView contentContainerStyle={styles.suggestionContent} showsVerticalScrollIndicator={false}>
                    <Text style={styles.suggestionSubTitle}>કેટેગરી પસંદ કરો (Category):</Text>
                    <View style={styles.categoryWrap}>
                        {['New Temple', 'Improve App', 'Other'].map(cat => (
                            <TouchableOpacity 
                                key={cat} 
                                style={[styles.catChip, suggestionCategory === cat && styles.catChipActive]}
                                onPress={() => setSuggestionCategory(cat)}
                            >
                                <Text style={[styles.catChipText, suggestionCategory === cat && styles.catChipTextActive]}>{cat}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.suggestionSubTitle}>તમારું સૂચન અહીં લખો:</Text>
                    <TextInput 
                        style={styles.suggestionInput}
                        multiline
                        numberOfLines={4}
                        placeholder="Write your suggestion here..."
                        value={suggestionMessage}
                        onChangeText={setSuggestionMessage}
                        textAlignVertical="top"
                    />

                    <TouchableOpacity 
                        style={[styles.premiumUpdateBtn, isSendingSuggestion && { opacity: 0.7 }]}
                        onPress={handleSendSuggestion}
                        disabled={isSendingSuggestion}
                    >
                        {isSendingSuggestion ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.updateBtnText}>Send Suggestion</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.suggestionCloseBtn} onPress={() => setIsSuggestionVisible(false)}>
                        <Text style={styles.suggestionCloseText}>Cancel</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        </View>
      </Modal>

      {/* LOCAL GUIDE REGISTRATION MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isGuideRegVisible}
        onRequestClose={() => setIsGuideRegVisible(false)}
      >
        <View style={styles.centerModalOverlay}>
            <View style={styles.suggestionCard}>
                <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.suggestionHeader}>
                    <Text style={styles.suggestionEmoji}>🚩</Text>
                    <Text style={styles.suggestionTitle}>Become a Tourist Guide</Text>
                </LinearGradient>
                <ScrollView contentContainerStyle={styles.suggestionContent} showsVerticalScrollIndicator={false}>
                    <Text style={styles.suggestionSubTitle}>ગાઈડ તરીકે રજીસ્ટ્રેશન કરી રોજગાર મેળવો:</Text>
                    
                    <Text style={styles.formLabel}>Full Name (નામ):</Text>
                    <TextInput 
                        style={styles.suggestionInput}
                        placeholder="Enter your full name"
                        value={guideFormData.name}
                        onChangeText={(val) => setGuideFormData({...guideFormData, name: val})}
                    />

                    <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                        <View style={{flex: 1, marginRight: 10}}>
                            <Text style={styles.formLabel}>Age:</Text>
                            <TextInput 
                                style={styles.suggestionInput}
                                placeholder="Age"
                                keyboardType="numeric"
                                value={guideFormData.age}
                                onChangeText={(val) => setGuideFormData({...guideFormData, age: val})}
                            />
                        </View>
                        <View style={{flex: 1.5}}>
                            <Text style={styles.formLabel}>Gender:</Text>
                            <View style={styles.categoryWrap}>
                                {['Male', 'Female'].map(g => (
                                    <TouchableOpacity 
                                        key={g} 
                                        style={[styles.catChip, guideFormData.gender === g && styles.catChipActive]}
                                        onPress={() => setGuideFormData({...guideFormData, gender: g})}
                                    >
                                        <Text style={[styles.catChipText, guideFormData.gender === g && styles.catChipTextActive]}>{g}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>

                    <Text style={styles.formLabel}>Contact Number (મોબાઈલ):</Text>
                    <TextInput 
                        style={styles.suggestionInput}
                        placeholder="Mobile Number"
                        keyboardType="phone-pad"
                        value={guideFormData.contact}
                        onChangeText={(val) => setGuideFormData({...guideFormData, contact: val})}
                    />

                    <Text style={styles.formLabel}>Select District (જિલ્લો):</Text>
                    <View style={styles.categoryWrap}>
                        {['Gir Somnath', 'Devbhumi Dwarka', 'Kheda', 'Bhavnagar', 'Panchmahal', 'Banaskantha'].map(dist => (
                            <TouchableOpacity 
                                key={dist} 
                                style={[styles.catChip, guideFormData.district === dist && styles.catChipActive]}
                                onPress={() => setGuideFormData({...guideFormData, district: dist})}
                            >
                                <Text style={[styles.catChipText, guideFormData.district === dist && styles.catChipTextActive]}>{dist}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.formLabel}>Specific Area (સ્થાનિક વિસ્તાર):</Text>
                    <TextInput 
                        style={styles.suggestionInput}
                        placeholder="e.g. Somnath Temple Area"
                        value={guideFormData.area}
                        onChangeText={(val) => setGuideFormData({...guideFormData, area: val})}
                    />

                    <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                        <View style={{flex: 1, marginRight: 10}}>
                            <Text style={styles.formLabel}>Exp (અનુભવ):</Text>
                            <TextInput 
                                style={styles.suggestionInput}
                                placeholder="e.g. 5 yrs"
                                value={guideFormData.experience}
                                onChangeText={(val) => setGuideFormData({...guideFormData, experience: val})}
                            />
                        </View>
                        <View style={{flex: 1}}>
                            <Text style={styles.formLabel}>Charges (ભાવ):</Text>
                            <TextInput 
                                style={styles.suggestionInput}
                                placeholder="e.g. ₹500/day"
                                value={guideFormData.hourlyRate}
                                onChangeText={(val) => setGuideFormData({...guideFormData, hourlyRate: val})}
                            />
                        </View>
                    </View>

                    <Text style={styles.formLabel}>Languages (ભાષાઓ):</Text>
                    <TextInput 
                        style={styles.suggestionInput}
                        placeholder="e.g. Gujarati, Hindi"
                        value={guideFormData.languages}
                        onChangeText={(val) => setGuideFormData({...guideFormData, languages: val})}
                    />

                    <Text style={styles.formLabel}>Short Bio (તમારા વિશે):</Text>
                    <TextInput 
                        style={styles.suggestionInput}
                        multiline
                        numberOfLines={3}
                        placeholder="Describe your services..."
                        value={guideFormData.bio}
                        onChangeText={(val) => setGuideFormData({...guideFormData, bio: val})}
                    />

                    <TouchableOpacity 
                        style={[styles.premiumUpdateBtn, isRegisteringGuide && { opacity: 0.7 }]}
                        onPress={handleRegisterGuide}
                        disabled={isRegisteringGuide}
                    >
                        {isRegisteringGuide ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.updateBtnText}>Register as Guide</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.suggestionCloseBtn} onPress={() => setIsGuideRegVisible(false)}>
                        <Text style={styles.suggestionCloseText}>Cancel</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        </View>
      </Modal>

      {/* LOCAL GUIDES LIST MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isGuidesModalVisible}
        onRequestClose={() => setIsGuidesModalVisible(false)}
      >
        <View style={styles.centerModalOverlay}>
            <View style={styles.guideListCard}>
                <LinearGradient 
                    colors={['#0ea5e9', '#2563eb']} 
                    style={styles.guideHeaderPremium}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                >
                    <View style={styles.guideHeaderTopRow}>
                        <View style={styles.guideHeaderIconBadge}>
                            <Text style={{fontSize: 22}}>🚩</Text>
                        </View>
                        <TouchableOpacity style={styles.guideTopCloseBtn} onPress={() => setIsGuidesModalVisible(false)}>
                            <Text style={styles.guideTopCloseText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    
                    <View style={{marginTop: 15}}>
                        <Text style={styles.guideMainTitle}>Local Experts</Text>
                        <Text style={styles.guideMainSubtitle}>Connect with verified guides in this area</Text>
                    </View>
                </LinearGradient>
                
                <View style={styles.guideListBody}>
                    <View style={styles.guideDistrictHeader}>
                        <View>
                            <Text style={styles.guideDistrictLabel}>REGION</Text>
                            <Text style={styles.guideDistrictValue}>{getDistrictTranslation(selectedTemple?.district, language)}</Text>
                        </View>
                        <View style={styles.guideCountBadge}>
                            <Text style={styles.guideCountText}>{guideDistrictList.length} Found</Text>
                        </View>
                    </View>

                    {isGuidesLoading ? (
                        <View style={styles.guideLoadingState}>
                            <ActivityIndicator color="#2563eb" size="large" />
                            <Text style={styles.guideLoadingText}>Searching local database...</Text>
                        </View>
                    ) : (
                        guideDistrictList.length > 0 ? (
                            <ScrollView 
                                style={{ flex: 1 }}
                                showsVerticalScrollIndicator={false} 
                                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                            >
                                {guideDistrictList.map((g, idx) => (
                                        <View key={idx} style={styles.premiumGuideItem}>
                                            <View style={styles.guideItemTop}>
                                                <View style={styles.guideAvatarWrapper}>
                                                    <LinearGradient 
                                                        colors={['#f1f5f9', '#e2e8f0']} 
                                                        style={styles.guideAvatarGradient}
                                                    >
                                                        <Text style={styles.guideAvatarText}>{g.name ? g.name.charAt(0) : 'G'}</Text>
                                                    </LinearGradient>
                                                    {g.isVerified && (
                                                        <View style={styles.miniVerifyBadge}>
                                                            <Text style={{fontSize: 9, color: '#fff', fontWeight: 'bold'}}>✓</Text>
                                                        </View>
                                                    )}
                                                </View>

                                                <View style={styles.guideMainInfo}>
                                                    <View style={{flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between'}}>
                                                        <View style={{flex: 1}}>
                                                            <Text style={styles.guideItemName} numberOfLines={1}>{g.name}</Text>
                                                            <View style={styles.guideRatingRow}>
                                                                <Text style={styles.guideStarText}>⭐⭐⭐⭐⭐</Text>
                                                                <Text style={styles.guideRatingValue}>
                                                                    {g.rating || '4.8'} {g.reviewCount > 0 && `(${g.reviewCount})`}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    </View>
                                                    
                                                    <View style={styles.guideTagsRow}>
                                                        <Text style={styles.guideTypeTag}>{g.gender || 'Expert'}</Text>
                                                        <View style={styles.tagDot} />
                                                        <Text style={styles.guideTypeTag}>{g.age || '25+'} yrs</Text>
                                                    </View>
                                                </View>
                                            </View>
                                            
                                            <View style={styles.guideDetailsCard}>
                                                <View style={styles.guideQuickStats}>
                                                    <View style={styles.guideStatBox}>
                                                        <Text style={styles.guideStatValue}>{g.experience || '3+ yrs'}</Text>
                                                        <Text style={styles.guideStatTitle}>Experience</Text>
                                                    </View>
                                                    <View style={styles.guideVerticalLine} />
                                                    <View style={styles.guideStatBox}>
                                                        <Text style={[styles.guideStatValue, {color: '#16a34a'}]}>{g.hourlyRate || 'Flexible'}</Text>
                                                        <Text style={styles.guideStatTitle}>Daily Rate</Text>
                                                    </View>
                                                </View>
                                                
                                                <View style={styles.guideInfoStrip}>
                                                    <Text style={styles.guideStripText}>📍 {g.area || 'Nearby Area'}</Text>
                                                </View>

                                                <Text style={styles.guideBioSmall} numberOfLines={3}>
                                                    {g.bio || 'Professional local guide with deep knowledge of temple history and rituals.'}
                                                </Text>
                                                
                                                <View style={styles.guideFooterStrip}>
                                                    <Text style={styles.guideLangLabel}>🗣️ Speaks:</Text>
                                                    <Text style={styles.guideLangVal}>{g.languages || 'Gujarati, Hindi'}</Text>
                                                </View>
                                                
                                                {/* Reviews Section */}
                                                {g.reviewCount > 0 && (
                                                    <View style={{marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0'}}>
                                                        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
                                                            <Text style={{fontSize: 14, fontWeight: 'bold', color: '#1e293b'}}>
                                                                📝 સમીક્ષાઓ ({g.reviewCount})
                                                            </Text>
                                                        </View>
                                                        
                                                        {g.reviews && g.reviews.slice(0, 2).map((review, rIdx) => (
                                                            <View key={rIdx} style={{
                                                                backgroundColor: '#f8fafc',
                                                                padding: 10,
                                                                borderRadius: 8,
                                                                marginBottom: 6,
                                                                borderLeftWidth: 3,
                                                                borderLeftColor: '#FF9933'
                                                            }}>
                                                                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4}}>
                                                                    <Text style={{fontSize: 12, fontWeight: 'bold', color: '#475569'}}>
                                                                        {review.userName || 'User'}
                                                                    </Text>
                                                                    <View style={{flexDirection: 'row'}}>
                                                                        {[...Array(5)].map((_, i) => (
                                                                            <Text key={i} style={{fontSize: 12}}>
                                                                                {i < review.rating ? '⭐' : '☆'}
                                                                            </Text>
                                                                        ))}
                                                                    </View>
                                                                </View>
                                                                {review.comment && (
                                                                    <Text style={{fontSize: 12, color: '#64748b', fontStyle: 'italic'}} numberOfLines={2}>
                                                                        "{review.comment}"
                                                                    </Text>
                                                                )}
                                                            </View>
                                                        ))}
                                                        
                                                        {g.reviewCount > 2 && (
                                                            <Text style={{fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 4}}>
                                                                +{g.reviewCount - 2} વધુ સમીક્ષાઓ
                                                            </Text>
                                                        )}
                                                    </View>
                                                )}
                                            </View>

                                            <View style={styles.guideActionRow}>
                                                <TouchableOpacity 
                                                    style={styles.guideActionCall}
                                                    onPress={() => Linking.openURL(`tel:${g.contact}`)}
                                                >
                                                    <Text style={{fontSize: 16}}>📞</Text>
                                                    <Text style={styles.guideActionBtnText}>Call Now</Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity 
                                                    style={styles.guideActionWhatsapp}
                                                    onPress={() => Linking.openURL(`https://wa.me/${g.contact}?text=Hello ${g.name}, I found you on Divya Darshan app. I need a guide for ${selectedTemple?.name}.`)}
                                                >
                                                    <Text style={{fontSize: 16}}>💬</Text>
                                                    <Text style={[styles.guideActionBtnText, {color: '#fff'}]}>WhatsApp</Text>
                                                </TouchableOpacity>
                                            </View>

                                            <TouchableOpacity 
                                                style={styles.guidePrimaryBookBtn}
                                                onPress={() => {
                                                    setSelectedGuideForBooking(g);
                                                    setIsBookingModalVisible(true);
                                                }}
                                            >
                                                <LinearGradient 
                                                    colors={['#4f46e5', '#3730a3']} 
                                                    style={styles.guideBookGradient}
                                                    start={{x: 0, y: 0}}
                                                    end={{x: 1, y: 0}}
                                                >
                                                    <Text style={styles.guideBookBtnText}>📅 Book Appointment</Text>
                                                </LinearGradient>
                                            </TouchableOpacity>
                                        </View>
                                ))}
                            </ScrollView>
                        ) : (
                            <View style={styles.guideEmptyState}>
                                <View style={styles.guideEmptyIconCircle}>
                                    <Text style={{fontSize: 45}}>🚩</Text>
                                </View>
                                <Text style={styles.guideEmptyTitle}>Establishing Connection</Text>
                                <Text style={styles.guideEmptySub}>We haven't found any registered guides in {getDistrictTranslation(selectedTemple?.district, language)} yet.</Text>
                                <TouchableOpacity 
                                    style={styles.guideRegisterBtn}
                                    onPress={() => { setIsGuidesModalVisible(false); setIsGuideRegVisible(true); }}
                                >
                                    <LinearGradient colors={['#fbbf24', '#f59e0b']} style={styles.guideRegGradient}>
                                        <Text style={styles.guideRegBtnText}>Register as first Guide</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        )
                    )}
                </View>

                <TouchableOpacity 
                    style={styles.guideModalBottomBtn} 
                    onPress={() => setIsGuidesModalVisible(false)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.guideModalBottomText}>Close Service</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

      {/* LOCAL GUIDE BOOKING MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isBookingModalVisible}
        onRequestClose={() => setIsBookingModalVisible(false)}
      >
        <View style={styles.centerModalOverlay}>
            <View style={styles.bookingCard}>
                <LinearGradient 
                    colors={['#4f46e5', '#3730a3']} 
                    style={styles.bookingHeader}
                >
                    <Text style={styles.bookingTitle}>Confirm Appointment</Text>
                    <TouchableOpacity onPress={() => setIsBookingModalVisible(false)}>
                        <Text style={{color: '#fff', fontSize: 18}}>✕</Text>
                    </TouchableOpacity>
                </LinearGradient>

                <View style={styles.bookingContent}>
                    <View style={styles.bookingGuideInfo}>
                        <View style={styles.smallAvatar}>
                            <Text style={{color: '#4f46e5', fontWeight: 'bold'}}>{selectedGuideForBooking?.name?.charAt(0)}</Text>
                        </View>
                        <View style={{marginLeft: 12}}>
                            <Text style={styles.bookingGuideName}>{selectedGuideForBooking?.name}</Text>
                            <Text style={styles.bookingGuideDistrict}>{selectedGuideForBooking?.district}</Text>
                        </View>
                        <View style={styles.bookingPriceBadge}>
                            <Text style={styles.bookingPrice}>{selectedGuideForBooking?.hourlyRate || 'Flexible'}</Text>
                        </View>
                    </View>

                    <View style={styles.bookingForm}>
                        <Text style={styles.bookingLabel}>Select Visit Date</Text>
                        <TextInput 
                            style={styles.bookingInput}
                            placeholder="YYYY-MM-DD"
                            value={bookingDate}
                            onChangeText={setBookingDate}
                        />
                        <Text style={{fontSize: 11, color: '#94a3b8', marginTop: 4}}>Enter the date you plan to visit the temple.</Text>
                        
                        <View style={styles.bookingSummary}>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Temple:</Text>
                                <Text style={styles.summaryValue}>{selectedTemple?.name}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Guide Contact:</Text>
                                <Text style={styles.summaryValue}>{selectedGuideForBooking?.contact}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Your Name:</Text>
                                <Text style={styles.summaryValue}>{user?.name || 'Guest'}</Text>
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity 
                        style={styles.confirmBookingBtn}
                        onPress={handleConfirmBooking}
                        disabled={isBookingLoading}
                    >
                        {isBookingLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.confirmBookingText}>Confirm Guide Booking</Text>
                        )}
                    </TouchableOpacity>
                    
                    <Text style={styles.bookingSecureNote}>🔒 Secure & Reliable Local Service</Text>
                </View>
            </View>
        </View>
      </Modal>

      {/* GUIDE REVIEW MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isReviewModalVisible}
        onRequestClose={() => setIsReviewModalVisible(false)}
      >
        <View style={styles.centerModalOverlay}>
            <View style={styles.bookingCard}>
                <LinearGradient 
                    colors={['#FF9933', '#FF512F']} 
                    style={styles.bookingHeader}
                >
                    <Text style={styles.bookingTitle}>⭐ Rate Your Guide</Text>
                    <TouchableOpacity onPress={() => {
                        setIsReviewModalVisible(false);
                        setReviewRating(0);
                        setReviewComment('');
                    }}>
                        <Text style={{color: '#fff', fontSize: 18}}>✕</Text>
                    </TouchableOpacity>
                </LinearGradient>

                <View style={styles.bookingContent}>
                    <View style={styles.bookingGuideInfo}>
                        <View style={styles.smallAvatar}>
                            <Text style={{color: '#FF9933', fontWeight: 'bold'}}>{selectedAppointmentForReview?.guideName?.charAt(0)}</Text>
                        </View>
                        <View style={{marginLeft: 12, flex: 1}}>
                            <Text style={styles.bookingGuideName}>{selectedAppointmentForReview?.guideName}</Text>
                            <Text style={styles.bookingGuideDistrict}>બુકિંગ તારીખ: {selectedAppointmentForReview?.date}</Text>
                        </View>
                    </View>

                    <View style={styles.bookingForm}>
                        <Text style={styles.bookingLabel}>તમારી રેટિંગ આપો</Text>
                        <View style={{flexDirection: 'row', justifyContent: 'center', marginVertical: 20}}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <TouchableOpacity 
                                    key={star}
                                    onPress={() => setReviewRating(star)}
                                    style={{marginHorizontal: 8}}
                                >
                                    <Text style={{fontSize: 40}}>
                                        {star <= reviewRating ? '⭐' : '☆'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        
                        <Text style={[styles.bookingLabel, {marginTop: 10}]}>તમારો અનુભવ શેર કરો (વૈકલ્પિક)</Text>
                        <TextInput 
                            style={[styles.bookingInput, {height: 100, textAlignVertical: 'top', paddingTop: 12}]}
                            placeholder="ગાઈડ વિશે તમારા વિચારો લખો..."
                            value={reviewComment}
                            onChangeText={setReviewComment}
                            multiline={true}
                            numberOfLines={4}
                        />
                    </View>

                    <TouchableOpacity 
                        style={styles.confirmBookingBtn}
                        onPress={handleSubmitReview}
                        disabled={isSubmittingReview || reviewRating === 0}
                    >
                        {isSubmittingReview ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.confirmBookingText}>સમીક્ષા સબમિટ કરો</Text>
                        )}
                    </TouchableOpacity>
                    
                    <Text style={styles.bookingSecureNote}>🙏 તમારો પ્રતિસાદ અમારા માટે મહત્વનો છે</Text>
                </View>
            </View>
        </View>
      </Modal>

      {/* JOURNEY GUIDE MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isJourneyVisible}
        onRequestClose={() => setIsJourneyVisible(false)}
      >
        <View style={styles.centerModalOverlay}>
            <View style={styles.journeyGuideCard}>
                <LinearGradient 
                    colors={['#667eea', '#764ba2', '#f093fb']} 
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={styles.journeyHeader}
                >
                    <TouchableOpacity 
                        style={styles.journeyCloseBtn} 
                        onPress={() => setIsJourneyVisible(false)}
                    >
                        <Text style={styles.journeyCloseText}>✕</Text>
                    </TouchableOpacity>
                    
                    {/* Premium Icon with glow effect */}
                    <View style={styles.journeyHeaderIconContainer}>
                        <View style={styles.journeyHeaderIconGlow}>
                            <View style={styles.journeyHeaderIcon}>
                                <Text style={styles.journeyIconText}>🗺️</Text>
                            </View>
                        </View>
                    </View>
                    
                    <Text style={styles.journeyTitle}>Spiritual Journey Guide</Text>
                    <Text style={styles.journeyHeaderSubtitle}>Discover divine paths & sacred places</Text>
                </LinearGradient>
                
                <ScrollView contentContainerStyle={styles.journeyScrollContent} showsVerticalScrollIndicator={false}>
                    <Text style={styles.journeySubtitle}>Plan your divine route ✨</Text>
                    
                    <View style={styles.journeyInputSection}>
                        {/* Origin Input */}
                        <View style={{marginBottom: 20}}>
                            <View style={styles.journeyInputHeader}>
                                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <Text style={{fontSize: 20, marginRight: 8}}>📍</Text>
                                    <Text style={styles.journeyInputLabel}>Starting Point</Text>
                                </View>
                                <TouchableOpacity 
                                    style={styles.useCurrentBtn}
                                    onPress={handleGetCurrentLocation}
                                    disabled={isJourneyLoading}
                                >
                                    <Text style={styles.useCurrentIcon}>🎯</Text>
                                    <Text style={styles.useCurrentText}>Current</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.journeyInputWrapper}>
                                <TextInput 
                                    style={styles.journeyInput} 
                                    placeholder="e.g. Bhavnagar, Gujarat" 
                                    placeholderTextColor="#999"
                                    value={journeyOrigin}
                                    onChangeText={setJourneyOrigin}
                                    multiline={false}
                                />
                            </View>
                        </View>

                        {/* Destination Input */}
                        <View>
                            <View style={styles.journeyInputHeader}>
                                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <Text style={{fontSize: 20, marginRight: 8}}>🎯</Text>
                                    <Text style={styles.journeyInputLabel}>Destination</Text>
                                </View>
                                <TouchableOpacity 
                                    style={styles.pickMapBtn}
                                    onPress={async () => {
                                        try {
                                            // Get current location for map center
                                            let currentLoc = null;
                                            try {
                                                const { status } = await Location.requestForegroundPermissionsAsync();
                                                if (status === 'granted') {
                                                    const loc = await Location.getCurrentPositionAsync({});
                                                    currentLoc = `${loc.coords.latitude},${loc.coords.longitude}`;
                                                }
                                            } catch (e) {
                                                console.log("Could not get current location for map");
                                            }
                                            
                                            // Open Google Maps in search/explore mode
                                            const mapUrl = currentLoc 
                                                ? `https://www.google.com/maps/search/?api=1&query=${currentLoc}`
                                                : `https://www.google.com/maps/search/?api=1&query=temples+near+me`;
                                            
                                            const canOpen = await Linking.canOpenURL(mapUrl);
                                            if (canOpen) {
                                                await Linking.openURL(mapUrl);
                                                
                                                // Show instruction
                                                Alert.alert(
                                                    "📍 Pick Location on Map",
                                                    "1. Find your destination on Google Maps\n2. Long press on the location\n3. Copy the place name or address\n4. Come back and paste it in the destination field",
                                                    [{ text: "Got it!" }]
                                                );
                                            } else {
                                                Alert.alert("Error", "Cannot open Google Maps");
                                            }
                                        } catch (error) {
                                            Alert.alert("Error", "Could not open map: " + error.message);
                                        }
                                    }}
                                >
                                    <Text style={styles.pickMapIcon}>🗺️</Text>
                                    <Text style={styles.pickMapText}>Pick on Map</Text>
                                </TouchableOpacity>
                            </View>
                        <View style={styles.journeyInputWrapper}>
                            <TextInput 
                                style={styles.journeyInput} 
                                placeholder="e.g. Somnath Temple, Veraval or any location" 
                                placeholderTextColor="#999"
                                value={journeyDestination}
                                onChangeText={setJourneyDestination}
                                multiline={false}
                            />
                        </View>
                        <Text style={styles.journeyInputHint}>💡 Use map to pick location or type manually</Text>
                        </View>
                        
                        {/* Travel Mode Selector */}
                        <View style={{marginTop: 20}}>
                            <Text style={{fontSize: 14, fontWeight: 'bold', color: '#4f46e5', marginBottom: 12, textAlign: 'center'}}>
                                🚀 Select Travel Mode
                            </Text>
                            <View style={{flexDirection: 'row', justifyContent: 'space-between', gap: 10}}>
                                {/* Road Option */}
                                <TouchableOpacity
                                    style={[
                                        styles.travelModeButton,
                                        travelMode === 'road' && styles.travelModeButtonActive
                                    ]}
                                    onPress={() => setTravelMode('road')}
                                >
                                    <Text style={{fontSize: 28, marginBottom: 6}}>🚗</Text>
                                    <Text style={[
                                        styles.travelModeText,
                                        travelMode === 'road' && styles.travelModeTextActive
                                    ]}>By Road</Text>
                                    <Text style={[
                                        styles.travelModeSubtext,
                                        travelMode === 'road' && {color: '#fff'}
                                    ]}>Car/Bus</Text>
                                </TouchableOpacity>
                                
                                {/* Train Option */}
                                <TouchableOpacity
                                    style={[
                                        styles.travelModeButton,
                                        travelMode === 'train' && styles.travelModeButtonActive
                                    ]}
                                    onPress={() => setTravelMode('train')}
                                >
                                    <Text style={{fontSize: 28, marginBottom: 6}}>🚂</Text>
                                    <Text style={[
                                        styles.travelModeText,
                                        travelMode === 'train' && styles.travelModeTextActive
                                    ]}>By Train</Text>
                                    <Text style={[
                                        styles.travelModeSubtext,
                                        travelMode === 'train' && {color: '#fff'}
                                    ]}>Railway</Text>
                                </TouchableOpacity>
                                
                                {/* Flight Option */}
                                <TouchableOpacity
                                    style={[
                                        styles.travelModeButton,
                                        travelMode === 'flight' && styles.travelModeButtonActive
                                    ]}
                                    onPress={() => setTravelMode('flight')}
                                >
                                    <Text style={{fontSize: 28, marginBottom: 6}}>✈️</Text>
                                    <Text style={[
                                        styles.travelModeText,
                                        travelMode === 'flight' && styles.travelModeTextActive
                                    ]}>By Flight</Text>
                                    <Text style={[
                                        styles.travelModeSubtext,
                                        travelMode === 'flight' && {color: '#fff'}
                                    ]}>Airport</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>


                    {/* Embedded Map Preview - Shows when both locations are entered */}
                    {journeyOrigin.trim() && journeyDestination.trim() && (
                        <View style={styles.mapPreviewCard}>
                            <View style={styles.mapPreviewHeader}>
                                <Text style={styles.mapPreviewIcon}>🗺️</Text>
                                <View style={{flex: 1}}>
                                    <Text style={styles.mapPreviewTitle}>Live Route Map</Text>
                                    <Text style={styles.mapPreviewSubtitle}>
                                        {journeyOrigin.split(',')[0]} → {journeyDestination.split(',')[0]}
                                    </Text>
                                </View>
                            </View>
                            
                            {/* Embedded Google Maps */}
                            <View style={styles.mapContainer}>
                                <WebView
                                    source={{
                                        html: `
                                            <!DOCTYPE html>
                                            <html>
                                            <head>
                                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                                <style>
                                                    body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; }
                                                    iframe { width: 100%; height: 100%; border: 0; }
                                                </style>
                                            </head>
                                            <body>
                                                <iframe
                                                    src="https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&origin=${encodeURIComponent(journeyOrigin)}&destination=${encodeURIComponent(journeyDestination)}&mode=driving"
                                                    allowfullscreen
                                                    loading="lazy"
                                                    referrerpolicy="no-referrer-when-downgrade">
                                                </iframe>
                                            </body>
                                            </html>
                                        `
                                    }}
                                    style={{ flex: 1 }}
                                    javaScriptEnabled={true}
                                    domStorageEnabled={true}
                                    startInLoadingState={true}
                                    renderLoading={() => (
                                        <View style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E0F2FE'}}>
                                            <ActivityIndicator size="large" color="#0369A1" />
                                            <Text style={{marginTop: 10, color: '#0369A1', fontSize: 14}}>Loading map...</Text>
                                        </View>
                                    )}
                                />
                            </View>
                            
                            <View style={styles.mapActions}>
                                <TouchableOpacity 
                                    style={styles.mapActionBtn}
                                    onPress={() => {
                                        const mapUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(journeyOrigin)}&destination=${encodeURIComponent(journeyDestination)}&travelmode=driving`;
                                        Linking.openURL(mapUrl);
                                    }}
                                >
                                    <Text style={styles.mapActionIcon}>📱</Text>
                                    <Text style={styles.mapActionText}>Open in Google Maps</Text>
                                </TouchableOpacity>
                            </View>
                            
                            <Text style={styles.mapPreviewNote}>
                                💡 Interactive map - zoom, pan, and explore your route
                            </Text>
                        </View>
                    )}

                    {/* Route Information Hint */}
                    {journeyOrigin.trim() && journeyDestination.trim() && journeySteps.length === 0 && (
                        <View style={styles.routeInfoHint}>
                            <Text style={styles.routeInfoIcon}>🎯</Text>
                            <View style={{flex: 1}}>
                                <Text style={styles.routeInfoTitle}>Discover Your Divine Journey</Text>
                                <Text style={styles.routeInfoText}>
                                    Get detailed information about famous temples, historical sites, and spiritual places along your route with their stories and divine secrets!
                                </Text>
                            </View>
                        </View>
                    )}

                    <TouchableOpacity 
                        style={styles.revealPathBtn} 
                        onPress={handleGenerateJourney}
                        disabled={isJourneyLoading}
                        activeOpacity={0.8}
                    >
                        <LinearGradient 
                            colors={['#667eea', '#764ba2']} 
                            start={{x: 0, y: 0}}
                            end={{x: 1, y: 0}}
                            style={styles.revealPathGradient}
                        >
                            {isJourneyLoading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <>
                                    <Text style={styles.revealPathIcon}>✨</Text>
                                    <Text style={styles.revealPathText}>Reveal Divine Path</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    {journeySteps.length > 0 && (
                        <View style={{marginTop: 10}}>
                            <View style={{backgroundColor: '#eef2ff', padding: 15, borderRadius: 15, marginBottom: 15, borderBottomWidth: 3, borderBottomColor: '#4f46e5'}}>
                                <Text style={{fontSize: 18, fontWeight: 'bold', color: '#3730a3', textAlign: 'center'}}>✨ {journeyTitle}</Text>
                                
                                {/* Recommended Route Path */}
                                {journeyRoutePath && (
                                    <View style={{marginTop: 10, backgroundColor: '#FEF3C7', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#FCD34D'}}>
                                        <Text style={{fontSize: 11, fontWeight: 'bold', color: '#92400E', textAlign: 'center', marginBottom: 4}}>🗺️ RECOMMENDED ROUTE</Text>
                                        <Text style={{fontSize: 13, fontWeight: '600', color: '#78350F', textAlign: 'center'}}>{journeyRoutePath}</Text>
                                    </View>
                                )}
                                
                                <Text style={{fontSize: 12, color: '#6366f1', textAlign: 'center', marginTop: 8}}>📏 Distance: {journeyDistance} | ⏱️ Time: {journeyEstimatedTime || 'Calculating...'}</Text>
                                
                                {/* Places Count - Exact Route Only */}
                                <View style={{marginTop: 12, backgroundColor: '#fff', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#c7d2fe'}}>
                                    <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                                        <Text style={{fontSize: 26, marginRight: 10}}>🛣️</Text>
                                        <View>
                                            <Text style={{fontSize: 16, fontWeight: 'bold', color: '#4338ca'}}>
                                                {journeySteps.length} Places on This Route
                                            </Text>
                                            <Text style={{fontSize: 11, color: '#6366f1', marginTop: 3, fontStyle: 'italic'}}>
                                                Following the recommended path
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                
                                <TouchableOpacity 
                                    style={{marginTop: 12, backgroundColor: '#fff', padding: 8, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', borderWidth: 1, borderColor: '#e0e7ff'}}
                                    onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(journeyOrigin)}&destination=${encodeURIComponent(journeyDestination)}&travelmode=driving`)}
                                >
                                    <Text style={{fontSize: 14, marginRight: 8}}>🗺️</Text>
                                    <Text style={{color: '#4f46e5', fontWeight: 'bold', fontSize: 13}}>View Route on Google Maps</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={{paddingLeft: 10}}>
                                {journeySteps.map((step, idx) => (
                                    <View key={idx} style={{flexDirection: 'row', marginBottom: 25}}>
                                        {/* Timeline Line & Dot */}
                                        <View style={{alignItems: 'center', marginRight: 15}}>
                                            <View style={{width: 24, height: 24, borderRadius: 12, backgroundColor: '#4f46e5', zIndex: 2, justifyContent: 'center', alignItems: 'center', elevation: 3}}>
                                                <Text style={{color: '#fff', fontSize: 11, fontWeight: 'bold'}}>{idx + 1}</Text>
                                            </View>
                                            {idx < journeySteps.length - 1 && (
                                                <View style={{width: 3, flex: 1, backgroundColor: '#c7d2fe', marginVertical: 4}} />
                                            )}
                                        </View>

                                        {/* Content Card */}
                                        <View style={{flex: 1, backgroundColor: '#fff', borderRadius: 22, padding: 20, elevation: 5, borderLeftWidth: 6, borderLeftColor: '#4f46e5'}}>
                                            {/* Badges Row */}
                                            <View style={{flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12, gap: 8}}>
                                                {/* Category Badge */}
                                                {step.category && (
                                                    <View style={{backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#FCD34D'}}>
                                                        <Text style={{fontSize: 12, fontWeight: 'bold', color: '#92400E'}}>{step.category}</Text>
                                                    </View>
                                                )}
                                                
                                                {/* Highway Badge */}
                                                {step.highway && (
                                                    <View style={{backgroundColor: '#DBEAFE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#93C5FD'}}>
                                                        <Text style={{fontSize: 11, fontWeight: 'bold', color: '#1E40AF'}}>🛣️ {step.highway}</Text>
                                                    </View>
                                                )}
                                                
                                                {/* Distance Badge */}
                                                {step.distanceFromOrigin && (
                                                    <View style={{backgroundColor: '#E0E7FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#C7D2FE'}}>
                                                        <Text style={{fontSize: 11, fontWeight: 'bold', color: '#4338CA'}}>📍 {step.distanceFromOrigin}</Text>
                                                    </View>
                                                )}
                                            </View>
                                            
                                            <Text style={{fontSize: 19, fontWeight: 'bold', color: '#1e293b', marginBottom: 12}}>{step.name}</Text>
                                            <Text style={{fontSize: 15, color: '#334155', lineHeight: 24}}>{step.story}</Text>
                                            
                                            {/* Practical Info */}
                                            {step.practicalInfo && (
                                                <View style={{marginTop: 12, padding: 12, backgroundColor: '#F0FDF4', borderRadius: 12, borderWidth: 1, borderColor: '#BBF7D0'}}>
                                                    <Text style={{fontWeight: 'bold', color: '#166534', fontSize: 12, marginBottom: 4}}>ℹ️ PRACTICAL INFO</Text>
                                                    <Text style={{fontSize: 13, color: '#15803D', lineHeight: 20}}>{step.practicalInfo}</Text>
                                                </View>
                                            )}
                                            
                                            <View style={{marginTop: 18, padding: 14, backgroundColor: '#f0f9ff', borderRadius: 14, borderStyle: 'solid', borderWidth: 1, borderColor: '#bae6fd'}}>
                                                <Text style={{fontWeight: '900', color: '#0369a1', fontSize: 13, marginBottom: 6}}>🕉️ DIVINE SECRET</Text>
                                                <Text style={{fontSize: 14, fontStyle: 'italic', color: '#075985', lineHeight: 22}}>{step.secret}</Text>
                                            </View>

                                            {step.tip && (
                                                <View style={{marginTop: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fdf2f8', padding: 10, borderRadius: 10}}>
                                                    <Text style={{fontSize: 16, marginRight: 8}}>🎒</Text>
                                                    <Text style={{fontSize: 12, color: '#be185d', fontWeight: '600', flex: 1}}>Tip: {step.tip}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    <TouchableOpacity 
                        style={styles.journeyCloseBottomBtn} 
                        onPress={() => setIsJourneyVisible(false)}
                    >
                        <Text style={styles.journeyCloseBottomText}>Close Guide</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        </View>
      </Modal>

      {/* ADMIN PANEL MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isAdminVisible}
        onRequestClose={() => setIsAdminVisible(false)}
      >
        <View style={styles.centerModalOverlay}>
            <View style={styles.adminCard}>
                <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.adminHeader}>
                    <TouchableOpacity style={styles.headerCloseIcon} onPress={() => setIsAdminVisible(false)}>
                        <Text style={styles.headerCloseText}>✕</Text>
                    </TouchableOpacity>
                    <View style={styles.adminHeaderInfo}>
                        <Text style={styles.adminTitle}>Admin Console</Text>
                        <Text style={styles.adminSubtitle}>Manage your divine content</Text>
                    </View>
                </LinearGradient>
                
                <View style={styles.adminTabWrapper}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.adminTabScroll}>
                        {[
                            { id: 'suggestions', label: 'Suggestions', icon: '💡' },
                            { id: 'ratings', label: 'Ratings', icon: '⭐' },
                            { id: 'guides', label: 'Guides', icon: '🚩' },
                            { id: 'addTemple', label: 'Add Temple', icon: '⛩️' },
                            { id: 'manage', label: 'Manage', icon: '⚙️' },
                            { id: 'registerAdmin', label: 'Register Portal', icon: '👤' }
                        ].map((tab) => (
                            <TouchableOpacity 
                                key={tab.id}
                                style={[styles.premiumTab, activeAdminTab === tab.id && styles.premiumTabActive]} 
                                onPress={() => {
                                    setActiveAdminTab(tab.id);
                                    if(tab.id === 'suggestions') fetchAdminSuggestions();
                                    if(tab.id === 'ratings') fetchAdminRatings();
                                    if(tab.id === 'guides') fetchAdminGuides();
                                    if(tab.id === 'registerAdmin') fetchAdminUsers(); // Fetch users when tab selected
                                }}
                            >
                                <Text style={[styles.premiumTabText, activeAdminTab === tab.id && styles.premiumTabTextActive]}>
                                    {tab.icon} {tab.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <ScrollView style={styles.adminContent} showsVerticalScrollIndicator={false}>
                    {activeAdminTab === 'suggestions' && (
                        <View style={styles.adminSectionBody}>
                            {isAdminLoading ? (
                                <View style={styles.adminLoader}><ActivityIndicator color="#6366f1" size="large" /></View>
                            ) : (
                                Array.isArray(adminSuggestions) && adminSuggestions.length > 0 ? (
                                    adminSuggestions.map((s, idx) => (
                                        <View key={idx} style={styles.suggestionItem}>
                                            <View style={styles.suggestionTop}>
                                                <View style={styles.userAvatar}><Text style={styles.avatarLetter}>{s.userName?.charAt(0) || '?'}</Text></View>
                                                <View style={styles.userInfo}>
                                                    <Text style={styles.adminListHeader}>{s.userName}</Text>
                                                    <Text style={styles.adminListSub}>{s.contact}</Text>
                                                </View>
                                            </View>
                                            
                                            <View style={styles.suggestionBadgesRow}>
                                                <View style={styles.statusBadge}><Text style={styles.statusText}>{s.category}</Text></View>
                                                <View style={[styles.statusBadge, s.status === 'Added' ? {backgroundColor: '#dcfce7'} : {backgroundColor: '#fff7ed'}]}>
                                                    <Text style={[styles.statusText, s.status === 'Added' ? {color: '#16a34a'} : {color: '#ea580c'}]}>
                                                        {s.status === 'Added' ? '✅ Added' : '⏳ Pending'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={styles.suggestionBody}>
                                                <Text style={styles.adminListText}>{s.message}</Text>
                                            </View>
                                            <View style={styles.suggestionFooter}>
                                                <Text style={styles.adminDate}>📅 {new Date(s.createdAt).toLocaleDateString()}</Text>
                                                {s.category === 'New Temple' && s.status !== 'Added' && (
                                                    <TouchableOpacity 
                                                        style={styles.suggestionActionBtn}
                                                        onPress={() => handleApplySuggestion(s)}
                                                    >
                                                        <Text style={styles.suggestionActionText}>⛩️ Use as Temple</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>
                                    ))
                                ) : (
                                    <View style={styles.emptyContainer}>
                                        <Text style={styles.emptyIcon}>📭</Text>
                                        <Text style={styles.emptyText}>No suggestions found</Text>
                                    </View>
                                )
                            )}
                        </View>
                    )}

                    {activeAdminTab === 'ratings' && (
                        <View style={styles.adminSectionBody}>
                            {isAdminLoading ? (
                                <View style={styles.adminLoader}><ActivityIndicator color="#6366f1" size="large" /></View>
                            ) : (
                                Array.isArray(adminRatings) && adminRatings.length > 0 ? (
                                    adminRatings.map((r, idx) => (
                                        <View key={idx} style={styles.ratingListItem}>
                                            <View style={styles.userAvatar}><Text style={styles.avatarLetter}>{r.name?.charAt(0) || '?'}</Text></View>
                                            <View style={styles.adminRatingInfo}>
                                                <Text style={styles.adminListHeader}>{r.name}</Text>
                                                <Text style={styles.adminListSub}>{r.contact}</Text>
                                            </View>
                                            <View style={styles.starBadge}>
                                                <Text style={styles.starBadgeText}>⭐ {r.rating}</Text>
                                            </View>
                                        </View>
                                    ))
                                ) : (
                                    <View style={styles.emptyContainer}>
                                        <Text style={styles.emptyIcon}>⭐</Text>
                                        <Text style={styles.emptyText}>No ratings found</Text>
                                    </View>
                                )
                            )}
                        </View>
                    )}

                    {activeAdminTab === 'guides' && (
                        <View style={styles.adminSectionBody}>
                            {isAdminLoading ? (
                                <View style={styles.adminLoader}><ActivityIndicator color="#0369a1" size="large" /></View>
                            ) : (
                                Array.isArray(adminGuides) && adminGuides.length > 0 ? (
                                    adminGuides.map((g, idx) => (
                                        <View key={idx} style={styles.suggestionItem}>
                                            <View style={styles.suggestionTop}>
                                                <View style={[styles.userAvatar, {backgroundColor: '#e0f2fe'}]}><Text style={[styles.avatarLetter, {color: '#0369a1'}]}>{g.name?.charAt(0)}</Text></View>
                                                <View style={styles.userInfo}>
                                                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                                        <Text style={styles.adminListHeader}>{g.name}</Text>
                                                        {g.isVerified && <Text style={{marginLeft: 5, fontSize: 14}}>✅</Text>}
                                                    </View>
                                                    <Text style={styles.adminListSub}>{g.contact} | {g.district}</Text>
                                                </View>
                                                <View style={[styles.starBadge, {backgroundColor: g.isVerified ? '#dcfce7' : '#fee2e2'}]}>
                                                    <Text style={[styles.starBadgeText, {color: g.isVerified ? '#166534' : '#991b1b'}]}>{g.isVerified ? 'VERIFIED' : 'PENDING'}</Text>
                                                </View>
                                            </View>
                                            
                                            <View style={{marginTop: 10, padding: 10, backgroundColor: '#f8fafc', borderRadius: 10}}>
                                                <Text style={{fontSize: 13, color: '#475569'}}><Text style={{fontWeight: 'bold'}}>Exp:</Text> {g.experience} | <Text style={{fontWeight: 'bold'}}>Langs:</Text> {g.languages}</Text>
                                                <Text style={{fontSize: 12, color: '#64748b', marginTop: 5}}>{g.bio}</Text>
                                            </View>

                                            <View style={{flexDirection: 'column', marginTop: 10}}>
                                                <View style={{flexDirection: 'row', marginBottom: 8}}>
                                                    <TouchableOpacity 
                                                        style={[styles.suggestionActionBtn, {backgroundColor: g.isVerified ? '#fee2e2' : '#dcfce7', flex: 1}]}
                                                        onPress={() => handleVerifyGuide(g.id, !g.isVerified)}
                                                    >
                                                        <Text style={[styles.suggestionActionText, {color: g.isVerified ? '#991b1b' : '#166534'}]}>
                                                            {g.isVerified ? '❌ Unverify' : '✅ Verify Guide'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                </View>
                                                <View style={{flexDirection: 'row'}}>
                                                     <TouchableOpacity 
                                                        style={[styles.suggestionActionBtn, {backgroundColor: '#e0e7ff', flex: 1, marginRight: 5}]}
                                                        onPress={() => handleTwilioCall(g.contact, g.name)}
                                                    >
                                                        <Text style={[styles.suggestionActionText, {color: '#4338ca'}]}>🌐 Twilio Call</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity 
                                                        style={[styles.suggestionActionBtn, {backgroundColor: '#f1f5f9', flex: 1, marginLeft: 5}]}
                                                        onPress={() => Linking.openURL(`tel:${g.contact}`)}
                                                    >
                                                        <Text style={[styles.suggestionActionText, {color: '#64748b'}]}>📞 Native</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        </View>
                                    ))
                                ) : (
                                    <View style={styles.emptyContainer}>
                                        <Text style={styles.emptyIcon}>🚩</Text>
                                        <Text style={styles.emptyText}>No guide registrations yet</Text>
                                    </View>
                                )
                            )}
                        </View>
                    )}

                    {activeAdminTab === 'manage' && (
                        <View style={styles.adminSectionBody}>
                            {templeData.length > 0 ? templeData.map((stateGroup) => (
                                stateGroup.districts ? (
                                    stateGroup.districts.map((districtGroup) => (
                                        districtGroup.temples.map((temple, idx) => (
                                            <View key={`${stateGroup.state}-${districtGroup.district}-${idx}`} style={styles.manageItem}>
                                                <View style={{flex: 1}}>
                                                    <Text style={styles.adminListHeader}>{temple.name.split('–')[0]}</Text>
                                                    <Text style={styles.adminListSub}>📍 {temple.location}</Text>
                                                </View>
                                                <View style={styles.manageActions}>
                                                    <TouchableOpacity 
                                                        style={styles.actionBtnEdit}
                                                        onPress={() => {
                                                            setNewTemple({...temple});
                                                            setActiveAdminTab('addTemple');
                                                        }}
                                                    >
                                                        <Text style={styles.actionBtnText}>✏️ Edit</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity 
                                                        style={styles.actionBtnAI}
                                                        onPress={async () => {
                                                            setNewTemple({...temple});
                                                            setActiveAdminTab('addTemple');
                                                            Alert.alert("AI Intelligence", "Click '✨ Generate Content' to refresh this temple using Gemini AI.");
                                                        }}
                                                    >
                                                        <Text style={styles.actionBtnText}>✨ AI</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity 
                                                        style={[styles.actionBtnEdit, {backgroundColor: '#fee2e2', borderColor: '#fca5a5', borderWidth: 1}]}
                                                        onPress={() => handleDeleteTemple(temple)}
                                                    >
                                                        <Text style={[styles.actionBtnText, {color: '#dc2626'}]}>🗑️ Delete</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ))
                                    ))
                                ) : (
                                    stateGroup.temples ? stateGroup.temples.map((temple, idx) => (
                                        <View key={`${stateGroup.state}-${idx}`} style={styles.manageItem}>
                                            <View style={{flex: 1}}>
                                                <Text style={styles.adminListHeader}>{temple.name.split('–')[0]}</Text>
                                                <Text style={styles.adminListSub}>📍 {temple.location}</Text>
                                            </View>
                                            <View style={styles.manageActions}>
                                                <TouchableOpacity 
                                                    style={styles.actionBtnEdit}
                                                    onPress={() => {
                                                        setNewTemple({...temple});
                                                        setActiveAdminTab('addTemple');
                                                    }}
                                                >
                                                    <Text style={styles.actionBtnText}>✏️ Edit</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity 
                                                    style={styles.actionBtnAI}
                                                    onPress={async () => {
                                                        setNewTemple({...temple});
                                                        setActiveAdminTab('addTemple');
                                                        Alert.alert("AI Intelligence", "Click '✨ Generate Content' to refresh this temple using Gemini AI.");
                                                    }}
                                                >
                                                    <Text style={styles.actionBtnText}>✨ AI</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity 
                                                    style={[styles.actionBtnEdit, {backgroundColor: '#fee2e2', borderColor: '#fca5a5', borderWidth: 1}]}
                                                    onPress={() => handleDeleteTemple(temple)}
                                                >
                                                    <Text style={[styles.actionBtnText, {color: '#dc2626'}]}>🗑️ Delete</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )) : null
                                )
                            )) : (
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyIcon}>🚩</Text>
                                    <Text style={styles.emptyText}>No temples available</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {activeAdminTab === 'addTemple' && (
                        <View style={styles.formContainer}>
                            <View style={styles.formSection}>
                                <Text style={styles.formSectionTitle}>Basic Information</Text>
                                <View style={styles.aiGenerateWrapper}>
                                    <TextInput style={[styles.premiumAdminInput, {flex: 1}]} placeholder="Temple Name (e.g. સોમનાથ મહાદેવ)" value={newTemple.name} onChangeText={v => setNewTemple({...newTemple, name: v})} />
                                    <TouchableOpacity 
                                        style={[styles.premiumAiBtn, isAiGenerating && {opacity: 0.6}]} 
                                        onPress={handleAiGenerate}
                                        disabled={isAiGenerating}
                                    >
                                        <LinearGradient colors={['#6366f1', '#a855f7']} style={styles.aiBtnGradient}>
                                            <Text style={styles.aiBtnText}>{isAiGenerating ? "🌀" : "✨ Generate"}</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                                <TextInput style={styles.premiumAdminInput} placeholder="State (e.g. ગુજરાત)" value={newTemple.state} onChangeText={v => setNewTemple({...newTemple, state: v})} />
                                <TextInput style={styles.premiumAdminInput} placeholder="Exact Location" value={newTemple.location} onChangeText={v => setNewTemple({...newTemple, location: v})} />
                                <TextInput style={styles.premiumAdminInput} placeholder="YouTube Video ID (Optional)" value={newTemple.liveVideoId} onChangeText={v => setNewTemple({...newTemple, liveVideoId: v})} />
                                <TextInput style={styles.premiumAdminInput} placeholder="YouTube Channel URL (e.g. /@Channel/live)" value={newTemple.liveChannelUrl} onChangeText={v => setNewTemple({...newTemple, liveChannelUrl: v})} />
                            </View>

                            <View style={styles.formSection}>
                                <Text style={styles.formSectionTitle}>Divine Story (AI Generated)</Text>
                                <TextInput style={[styles.premiumAdminInput, {height: 100}]} placeholder="Historical Story" multiline value={newTemple.history} onChangeText={v => setNewTemple({...newTemple, history: v})} />
                                <TextInput style={[styles.premiumAdminInput, {height: 80}]} placeholder="Architecture Details" multiline value={newTemple.architecture} onChangeText={v => setNewTemple({...newTemple, architecture: v})} />
                                <TextInput style={[styles.premiumAdminInput, {height: 80}]} placeholder="Spiritual Significance" multiline value={newTemple.significance} onChangeText={v => setNewTemple({...newTemple, significance: v})} />
                            </View>

                            <View style={styles.formSection}>
                                <Text style={styles.formSectionTitle}>Visitor Info</Text>
                                <TextInput style={styles.premiumAdminInput} placeholder="Best Time to Visit" value={newTemple.bestTimeToVisit} onChangeText={v => setNewTemple({...newTemple, bestTimeToVisit: v})} />
                                <TextInput style={[styles.premiumAdminInput, {height: 60}]} placeholder="How to reach (Nearby transport)" multiline value={newTemple.howToReach} onChangeText={v => setNewTemple({...newTemple, howToReach: v})} />
                                <TextInput style={[styles.premiumAdminInput, {height: 60}]} placeholder="Nearby places to explore" multiline value={newTemple.nearbyAttractions} onChangeText={v => setNewTemple({...newTemple, nearbyAttractions: v})} />
                                <Text style={styles.adminLabel}>Aarti Timings (JSON Format)</Text>
                                <TextInput 
                                    style={[styles.premiumAdminInput, {height: 80, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'}]} 
                                    placeholder='[{ "h": 7, "m": 0, "label": "Morning Aarti" }]' 
                                    multiline 
                                    value={typeof newTemple.aartiTimings === 'string' ? newTemple.aartiTimings : JSON.stringify(newTemple.aartiTimings)} 
                                    onChangeText={v => setNewTemple({...newTemple, aartiTimings: v})} 
                                />
                            </View>
                            
                            <TouchableOpacity style={styles.mainSubmitBtn} onPress={handleAddTemple}>
                                <LinearGradient colors={['#10b981', '#059669']} style={styles.submitBtnGradient}>
                                    <Text style={styles.submitBtnText}>{isAdminLoading ? "Saving..." : (newTemple.id ? "Update Temple" : "Add New Temple")}</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    )}

                    {activeAdminTab === 'registerAdmin' && (
                        <View style={styles.formContainer}>
                             <View style={styles.formSection}>
                                <Text style={styles.formSectionTitle}>
                                    {adminRegisterData.id ? 'Edit User Details' : 'Create New Account (Admin Portal)'}
                                </Text>
                                
                                <Text style={[styles.premiumLabel, {marginTop: 10}]}>Select Role</Text>
                                <View style={{flexDirection: 'row', marginBottom: 20, marginTop: 10}}>
                                    {[
                                        {id: 'main_admin', label: 'Main Admin'}, 
                                        {id: 'sub_admin', label: 'Peta Admin'}, 
                                        {id: 'user', label: 'User'}
                                    ].map((r, idx) => (
                                        <TouchableOpacity 
                                            key={r.id}
                                            style={[
                                                styles.suggestionActionBtn, 
                                                {marginRight: 10, flex: 1, paddingVertical: 12},
                                                adminRegisterData.role === r.id ? {backgroundColor: '#4338ca', borderColor: '#4338ca'} : {backgroundColor: '#f1f5f9'}
                                            ]} 
                                            onPress={() => setAdminRegisterData({...adminRegisterData, role: r.id})}
                                        >
                                            <Text style={[
                                                styles.suggestionActionText, 
                                                adminRegisterData.role === r.id ? {color: '#fff'} : {color: '#64748b'}
                                            ]}>
                                                {r.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <Text style={styles.premiumLabel}>Full Name</Text>
                                <TextInput 
                                    style={styles.premiumAdminInput} 
                                    placeholder="Enter full name" 
                                    value={adminRegisterData.name} 
                                    onChangeText={v => setAdminRegisterData({...adminRegisterData, name: v})} 
                                />

                                <Text style={styles.premiumLabel}>Login ID (Contact for Login)</Text>
                                <TextInput 
                                    style={styles.premiumAdminInput} 
                                    placeholder="Enter Login ID (Email/Phone)" 
                                    value={adminRegisterData.contact} 
                                    onChangeText={v => setAdminRegisterData({...adminRegisterData, contact: v})} 
                                />

                                <Text style={styles.premiumLabel}>Phone Number (For Calling)</Text>
                                <TextInput 
                                    style={styles.premiumAdminInput} 
                                    placeholder="Enter Mobile Number" 
                                    keyboardType="phone-pad"
                                    value={adminRegisterData.phoneNumber} 
                                    onChangeText={v => setAdminRegisterData({...adminRegisterData, phoneNumber: v})} 
                                />

                                <Text style={styles.premiumLabel}>{adminRegisterData.id ? 'New Password (Optional)' : 'Password'}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, marginBottom: 12 }}>
                                    <TextInput 
                                        style={[styles.premiumAdminInput, { flex: 1, marginBottom: 0, borderWidth: 0 }]} 
                                        placeholder={adminRegisterData.id ? "Leave blank to keep same" : "Set a password"} 
                                        secureTextEntry={!showAdminPassword}
                                        value={adminRegisterData.password} 
                                        onChangeText={v => setAdminRegisterData({...adminRegisterData, password: v})} 
                                    />
                                    <TouchableOpacity 
                                        onPress={() => setShowAdminPassword(!showAdminPassword)}
                                        style={{ padding: 10 }}
                                    >
                                        <Ionicons name={showAdminPassword ? "eye" : "eye-off"} size={20} color="#64748b" />
                                    </TouchableOpacity>
                                </View>
                                
                                <View style={{height: 20}} />

                                <View style={{flexDirection: 'row'}}>
                                    {adminRegisterData.id && (
                                        <TouchableOpacity 
                                            style={[styles.mainSubmitBtn, {marginRight: 10, backgroundColor: '#64748b'}]} 
                                            onPress={() => setAdminRegisterData({ id: null, name: '', contact: '', phoneNumber: '', password: '', role: 'user' })}
                                        >
                                            <Text style={styles.submitBtnText}>Cancel</Text>
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity style={[styles.mainSubmitBtn, {flex: 1}]} onPress={handleAdminRegister}>
                                        <LinearGradient colors={['#4338ca', '#3b82f6']} style={styles.submitBtnGradient}>
                                            <Text style={styles.submitBtnText}>
                                                {isAdminLoading ? "Processing..." : (adminRegisterData.id ? "Update User" : "Register User")}
                                            </Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                             </View>

                             {/* LIST OF EXISTING USERS */}
                             <View style={[styles.formSection, {marginTop: 20, backgroundColor: '#f8fafc'}]}>
                                <Text style={styles.formSectionTitle}>Manage Users ({adminUsers.length})</Text>
                                {adminUsers.map((u, idx) => (
                                    <View key={idx} style={styles.suggestionItem}>
                                        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                                            <View style={{flex: 1}}>
                                                <Text style={styles.adminListHeader}>{u.name} <Text style={{fontSize: 12, color: '#6366f1'}}>({u.role})</Text></Text>
                                                <Text style={styles.adminListSub}>{u.contact}</Text>
                                                {u.phoneNumber ? <Text style={styles.adminListSub}>📞 {u.phoneNumber}</Text> : null}
                                            </View>
                                            <View style={{flexDirection: 'row'}}>
                                                <TouchableOpacity style={styles.actionBtnEdit} onPress={() => handleEditUser(u)}>
                                                    <Text style={styles.actionBtnText}>✏️</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={[styles.actionBtnEdit, {backgroundColor: '#fee2e2', marginLeft: 5}]} onPress={() => handleDeleteUser(u.id, u.name)}>
                                                    <Text style={{fontSize: 14}}>🗑️</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                             </View>
                        </View>
                    )}
                    <View style={{height: 60}} />
                </ScrollView>
            </View>
        </View>
      </Modal>

      {/* DONATION MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isDonationVisible}
        onRequestClose={() => setIsDonationVisible(false)}
      >
        <View style={styles.centerModalOverlay}>
            <View style={styles.donationCard}>
                <LinearGradient colors={['#FF9933', '#FF512F']} style={styles.donationHeader}>
                    <TouchableOpacity style={styles.headerCloseIcon} onPress={() => setIsDonationVisible(false)}>
                        <Text style={styles.headerCloseText}>✕</Text>
                    </TouchableOpacity>
                    <Text style={styles.donationEmoji}>🙏</Text>
                    <Text style={styles.donationTitle}>Support Divya Darshan</Text>
                </LinearGradient>
                <ScrollView contentContainerStyle={styles.donationContent} showsVerticalScrollIndicator={false}>
                    <Text style={styles.donationBigText}>
                        ભગવાનની આરતી અને દર્શન વધુ ભક્તો સુધી પહોંચે તે માટે તમારું દાન અમૂલ્ય છે. આપનો દરેક સહયોગ ધાર્મિક સેવા માટે ઉપયોગમાં લેવામાં આવશે.
                    </Text>
                    
                    <View style={styles.donationBox}>
                        <Text style={styles.donationLabel}>Donate via UPI ID:</Text>
                        <TouchableOpacity 
                            style={styles.upiContainer}
                            onPress={() => Alert.alert("UPI ID Copied", "6353455902@ptsbi")}
                        >
                            <Text style={styles.upiText}>6353455902@ptsbi</Text>
                            <Text style={styles.copyText}>Tap to copy</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.qrContainer}>
                        <Image 
                            source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent('upi://pay?pa=6353455902@ptsbi&pn=NIKUNJ PANDYA&tn=Donation for Divya Darshan&cu=INR')}` }} 
                            style={styles.qrImage}
                        />
                        <Text style={styles.qrSubText}>Scan to Support</Text>
                    </View>
                   <Text style={styles.donationFooter}>
                        તમારા નાના યોગદાનથી અમે આ સેવાને વધુ બહેતર બનાવી શકીશું. આભાર!
                    </Text>

                    <TouchableOpacity 
                        style={styles.directDonateBtn} 
                        onPress={handleDirectDonate}
                    >
                        <Text style={styles.directDonateBtnText}>Pay via UPI (GPay/PhonePe)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.donationCloseBtn} onPress={() => setIsDonationVisible(false)}>
                       <Text style={styles.donationCloseText}>Close</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        </View>
      </Modal>

      {/* ATTRACTIVE ABOUT US MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isAboutVisible}
        onRequestClose={() => setIsAboutVisible(false)}
      >
        <View style={styles.centerModalOverlay}>
            <View style={styles.aboutCard}>
                <LinearGradient colors={['#FF9933', '#FF512F']} style={styles.aboutHeader}>
                    <TouchableOpacity style={styles.headerCloseIcon} onPress={() => setIsAboutVisible(false)}>
                        <Text style={styles.headerCloseText}>✕</Text>
                    </TouchableOpacity>
                    <Text style={styles.aboutEmoji}>🕉️</Text>
                    <Text style={styles.aboutTitle}>About Us</Text>
                </LinearGradient>
                <ScrollView style={styles.aboutContent} showsVerticalScrollIndicator={false}>
                    <Text style={styles.aboutHeaderTitle}>અમારા વિશે (About Us)</Text>
                    <Text style={styles.aboutText}>
                        અમારી આ એપ <Text style={{fontWeight:'bold', color: '#D35400'}}>DVN Group</Text> દ્વારા ભક્તિ, શ્રદ્ધા અને આધ્યાત્મિક શાંતિને દરેક ભક્ત સુધી પહોંચાડવાનો એક નમ્ર પ્રયાસ છે.
                    </Text>
                    <Text style={styles.aboutText}>
                        આ એપ દ્વારા તમે વિવિધ મંદિરોની લાઈવ આરતી, દિવ્ય દર્શન અને ધાર્મિક ક્ષણોને ક્યારેય પણ, ક્યાંયથી પણ અનુભવ કરી શકો છો.
                    </Text>
                    <Text style={styles.aboutText}>
                        આજના વ્યસ્ત જીવનમાં દરેકને મંદિરે જવું શક્ય નથી, એ ભાવનાને ધ્યાનમાં રાખીને અમે આ પ્લેટફોર્મ બનાવ્યું છે, જેથી ભક્તો ઘર બેઠા ભગવાન સાથે જોડાઈ શકે.
                    </Text>
                    <View style={styles.missionBox}>
                        <Text style={styles.missionText}>
                            "તમારી શ્રદ્ધા – અમારી સેવા"
                        </Text>
                    </View>

                    <View style={styles.contactContainer}>
                        <Text style={styles.aboutHeaderTitle}>સંપર્ક કરો (Contact Us)</Text>
                        <View style={styles.contactRow}>
                            <Text style={styles.contactIcon}>📞</Text>
                            <Text style={styles.contactText}>+91 6300000000</Text>
                        </View>
                        <View style={styles.contactRow}>
                            <Text style={styles.contactIcon}>📧</Text>
                            <Text style={styles.contactText}>dvngroup@gmail.com</Text>
                        </View>
                    </View>
                    
                     <Text style={styles.aboutFooter}>Developed with ❤️ by DVN Group</Text>
                </ScrollView>
                <TouchableOpacity style={styles.closeButton} onPress={() => setIsAboutVisible(false)}>
                    <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

      {/* ATTRACTIVE PROFILE MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isProfileVisible}
        onRequestClose={() => setIsProfileVisible(false)}
      >
        <View style={styles.centerModalOverlay}>
            <View style={styles.aboutCard}>
                <LinearGradient colors={['#FF9933', '#FF512F']} style={styles.aboutHeader}>
                    <TouchableOpacity style={styles.headerCloseIcon} onPress={() => setIsProfileVisible(false)}>
                        <Text style={styles.headerCloseText}>✕</Text>
                    </TouchableOpacity>
                    <View style={styles.profileAvatarLarge}>
                        <Text style={styles.profileAvatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.aboutTitle}>My Profile</Text>
                </LinearGradient>
                
                <ScrollView style={styles.aboutContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.profileEditSection}>
                        <Text style={styles.profileInfoLabel}>Full Name</Text>
                        <TextInput 
                            style={styles.profileInput} 
                            value={editName}
                            onChangeText={setEditName}
                            placeholder="Enter your name"
                            placeholderTextColor="#ccc"
                        />
                    </View>

                    <View style={styles.profileInfoRow}>
                        <Text style={styles.profileInfoLabel}>Email / Login ID (Read Only)</Text>
                        <Text style={styles.profileInfoValue}>{user?.contact}</Text>
                    </View>

                    <View style={styles.profileEditSection}>
                        <Text style={styles.profileInfoLabel}>Mobile Number (For Calling)</Text>
                        <TextInput 
                            style={styles.profileInput} 
                            value={editPhone}
                            onChangeText={setEditPhone}
                            placeholder="+91..."
                            keyboardType="phone-pad"
                            placeholderTextColor="#ccc"
                        />
                    </View>
                    
                    <View style={styles.profileInfoRow}>
                        <Text style={styles.profileInfoLabel}>Account Status</Text>
                        <View style={{flexDirection: 'row', marginTop: 5, justifyContent: 'space-between', alignItems: 'center'}}>
                            <View style={styles.verifiedBadge}>
                                <Text style={styles.verifiedText}>✓ Verified Devotee</Text>
                            </View>
                            {user?.rating > 0 && (
                                <View style={styles.profileRatingBadge}>
                                    <Text style={styles.profileRatingText}>⭐ {user.rating}/5</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <TouchableOpacity 
                        style={[styles.premiumUpdateBtn, isUpdating && { opacity: 0.7 }]} 
                        onPress={handleUpdateProfile}
                        disabled={isUpdating}
                    >
                        {isUpdating ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.updateBtnText}>Update Profile</Text>
                        )}
                    </TouchableOpacity>

                    {/* Guide Appointment Section */}
                    {user && user.wantsToWorkAsGuide && (
                        <View style={{ marginTop: 20, padding: 15, backgroundColor: '#FFF3E0', borderRadius: 15, borderLeftWidth: 5, borderLeftColor: '#FF9933' }}>
                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#E65100', marginBottom: 10 }}>LOCAL GUIDE DASHBOARD</Text>
                            <TouchableOpacity 
                                style={{ backgroundColor: '#FF9933', padding: 12, borderRadius: 10, alignItems: 'center' }} 
                                onPress={() => setIsAppointmentsVisible(true)}
                            >
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                                    View Booking Requests ({guideAppointments.filter(a => a.status === 'pending').length})
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* User Booking Section */}
                    {userAppointments.length > 0 && (
                        <View style={{ marginTop: 20, padding: 15, backgroundColor: '#E3F2FD', borderRadius: 15, borderLeftWidth: 5, borderLeftColor: '#2196F3' }}>
                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1565C0', marginBottom: 10 }}>MY GUIDE BOOKINGS</Text>
                            <TouchableOpacity 
                                style={{ backgroundColor: '#2196F3', padding: 12, borderRadius: 10, alignItems: 'center' }} 
                                onPress={() => setIsUserBookingsVisible(true)}
                            >
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                                    View My Bookings ({userAppointments.length})
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={{height: 20}} />

                    <TouchableOpacity style={styles.logoutActionBtn} onPress={handleLogout}>
                        <Text style={styles.logoutActionText}>Logout from App</Text>
                    </TouchableOpacity>
                    
                    <View style={{height: 30}} />
                </ScrollView>
                <GuideAppointmentsView />
                <UserBookingsView />

                <TouchableOpacity style={styles.closeButton} onPress={() => setIsProfileVisible(false)}>
                    <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5E6' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF5E6' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#D35400' },
  
  header: {
    paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
    elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84,
  },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  headerSubtitle: { color: '#FFE0B2', fontSize: 14, textAlign: 'center', marginTop: 5 },

  menuItemLogout: { borderBottomColor: 'rgba(255, 0, 0, 0.1)' },
  menuIconLogout: { color: '#C62828' },
  menuLabelLogout: { color: '#C62828' },
  backButtonText: { color: '#fff', fontWeight: 'bold' },

  content: { padding: 16 },
  detailContent: { padding: 16 },

  // List Styles
  stateGroup: { marginBottom: 25 },
  stateTitle: { fontSize: 20, fontWeight: 'bold', color: '#D35400', marginBottom: 10, marginLeft: 5 },
  
  districtGroup: { marginBottom: 15, paddingLeft: 5 },
  districtHeader: { backgroundColor: '#FFF8F0', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, marginBottom: 10, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#FFE0B2' },
  districtTitle: { fontSize: 14, fontWeight: 'bold', color: '#E67E22' },
  templeRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 12, padding: 15, marginBottom: 10,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }
  },
  templeIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF0E0', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  templeIconText: { fontSize: 20 },
  templeInfo: { flex: 1 },
  templeName: { fontSize: 16, fontWeight: '600', color: '#333' },
  templeLocation: { fontSize: 12, color: '#666', marginTop: 2 },
  arrow: { fontSize: 24, color: '#ccc', fontWeight: 'bold' },

  // Detail Card Styles (Similar to previous)
  card: {
    backgroundColor: '#fff', borderRadius: 15, marginBottom: 20,
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.22, shadowRadius: 2.22,
    overflow: 'hidden',
  },
  videoContainer: { backgroundColor: '#000', minHeight: 220 },
  placeholderVideo: { height: 220, justifyContent: 'center', alignItems: 'center', backgroundColor: '#e0e0e0' },
  placeholderText: { color: '#555', fontSize: 16, fontWeight: 'bold' },
  placeholderSubText: { color: '#777', fontSize: 12, marginTop: 5 },
  infoSection: { padding: 15 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#D35400', flex: 1 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e74c3c', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff', marginRight: 5 },
  liveText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  location: { fontSize: 14, color: '#666', marginBottom: 10 },
  description: { fontSize: 16, color: '#333', lineHeight: 24, marginBottom: 15 },
  
  guidesBtn: { marginTop: 15, borderRadius: 12, overflow: 'hidden', elevation: 3 },
  guidesBtnGradient: { paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center' },
  guidesBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  formLabel: { fontSize: 13, fontWeight: 'bold', color: '#0369a1', marginTop: 12, marginBottom: 5 },

  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#D35400', margin: 15, marginBottom: 5 },
  infoText: { fontSize: 14, color: '#444', lineHeight: 22, marginHorizontal: 15, marginBottom: 15 },

  footer: { alignItems: 'center', marginTop: 20, marginBottom: 20 },
  footerText: { color: '#999', fontSize: 14 },

  // Horizontal Scroll Styles
  horizontalScroll: { flexDirection: 'row', paddingLeft: 5 },
  
  // Full Screen Styles
  fullScreenContainer: {
    padding: 0,
    flex: 1,
    backgroundColor: '#000',
  },
  fullScreenCard: {
    margin: 0,
    borderRadius: 0,
    flex: 1,
  },
  fullScreenButton: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fff',
  },
  minimizeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fff',
    zIndex: 100,
  },
  fsButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },

  aartiCard: {
      backgroundColor: '#fff', width: 120, height: 140, borderRadius: 12, marginRight: 15,
      alignItems: 'center', justifyContent: 'center', padding: 10,
      elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }
  },
  aartiIcon: {
      width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFF0E0',
      justifyContent: 'center', alignItems: 'center', marginBottom: 10
  },
  aartiIconText: { fontSize: 24 },
  aartiName: { fontSize: 14, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  aartiSubtext: { fontSize: 10, color: '#FF512F', marginTop: 4, fontWeight: '600' },
  
  // Language Button Styles (Header)
  headerLangContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 2 },
  headerLangBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  headerLangBtnActive: { backgroundColor: '#fff' },
  headerLangText: { fontSize: 10, color: '#fff', fontWeight: 'bold' },
  headerLangTextActive: { color: '#FF512F' },

  // Language Button Styles (Detail)
  langContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    marginTop: 0,
    marginHorizontal: 15,
    justifyContent: 'flex-start',
  },
  langButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10,
    backgroundColor: '#f9f9f9',
  },
  langButtonActive: {
    backgroundColor: '#D35400', 
    borderColor: '#D35400',
  },
  langText: {
    fontSize: 14,
    color: '#555',
  },
  langTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },

  
  // Login Styles
  loginWrapper: { flex: 1 },
  loginGradient: { flex: 1 },
  loginContainer: {
      flex: 1,
  },
  loginScrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 25,
  },
  loginCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: 25,
      padding: 30,
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
  },
  loginHeaderContainer: { alignItems: 'center', marginBottom: 35 },
  loginEmoji: { fontSize: 50, marginBottom: 10 },
  premiumLoginTitle: { 
      fontSize: 32, 
      fontWeight: 'bold', 
      color: '#8B4513', // SaddleBrown for a spiritual/earthy look
      letterSpacing: 1
  },
  loginSubtitle: { fontSize: 14, color: '#A0522D', marginTop: 5, fontWeight: '500' },
  
  premiumLabel: { fontSize: 14, fontWeight: 'bold', color: '#8B4513', marginBottom: 8, marginLeft: 2 },
  premiumInput: {
      backgroundColor: '#FFF8F0',
      borderBottomWidth: 2,
      borderBottomColor: '#FFD194',
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: '#5D4037',
      marginBottom: 5
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8F0',
    borderBottomWidth: 2,
    borderBottomColor: '#FFD194',
    borderRadius: 8,
    marginBottom: 5,
  },
  eyeIcon: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumLoginButton: {
      padding: 16,
      borderRadius: 30,
      alignItems: 'center',
      marginTop: 20,
      elevation: 4,
      shadowColor: '#FF9933',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
  },
  loginButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },
  footerNote: { textAlign: 'center', color: '#8B4513', fontSize: 12, fontWeight: '600' },
  loginFooterContainer: { marginTop: 20, alignItems: 'center' },
  divider: { height: 1, backgroundColor: '#FFD194', width: '80%', marginBottom: 15 },

  toggleModeButton: {
      marginTop: 20,
      alignItems: 'center',
  },
  toggleModeText: {
      color: '#8B4513',
      fontSize: 14,
      fontWeight: 'bold',
      textDecorationLine: 'underline'
  },
  forgotButton: {
      marginTop: 15,
      alignItems: 'center',
  },
  forgotText: {
      color: '#D35400',
      fontSize: 13,
      fontWeight: '600',
  },
  
  logoutButton: { position: 'absolute', top: 60, right: 20, zIndex: 10, padding: 5 },
  logoutText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  
  skipButton: {
      marginTop: 15,
      alignItems: 'center',
      padding: 10,
  },
  skipButtonText: {
      color: '#D35400',
      fontSize: 16,
      fontWeight: '600',
  },

  menuButton: { position: 'absolute', top: 60, left: 20, zIndex: 10 },
  menuText: { color: '#fff', fontSize: 26, fontWeight: 'bold' },

  // Menu Modal Styles
  modalOverlay: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalBackdrop: { flex: 1 },
  menuContainer: { width: '75%', backgroundColor: '#fff', height: '100%', elevation: 5 },
  menuHeader: { padding: 25, paddingTop: 60, marginBottom: 10 },
  menuHeaderTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  menuHeaderSubtitle: { color: '#FFE0B2', fontSize: 14, marginTop: 5 },
  menuItems: { padding: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 10, marginBottom: 5 }, // Hover effect not natively supported like CSS
  menuIcon: { fontSize: 22, marginRight: 20 },
  menuLabel: { fontSize: 16, color: '#333', fontWeight: '500' },
  menuFooter: { position: 'absolute', bottom: 20, left: 20 },
  menuFooterText: { color: '#999', fontSize: 12 },

  // Donation Modal Styles
  donationCard: { backgroundColor: '#fff', width: '90%', borderRadius: 25, overflow: 'hidden', elevation: 20, maxHeight: '85%' },
  donationHeader: { padding: 25, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  donationEmoji: { fontSize: 45, marginBottom: 5 },
  donationTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  donationContent: { padding: 25, alignItems: 'center' },
  donationBigText: { fontSize: 15, color: '#444', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  
  donationBox: { width: '100%', backgroundColor: '#FFF5E6', padding: 15, borderRadius: 15, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#FFE0B2' },
  donationLabel: { fontSize: 14, color: '#D35400', fontWeight: 'bold', marginBottom: 8 },
  upiContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#FFCC80', elevation: 2 },
  upiText: { fontSize: 16, fontWeight: 'bold', color: '#333', marginRight: 10 },
  copyText: { fontSize: 10, color: '#fff', backgroundColor: '#FF9933', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontWeight: 'bold' },
  
  qrContainer: { alignItems: 'center', marginBottom: 20 },
  qrImage: { width: 180, height: 180, marginBottom: 10, borderRadius: 10, borderWidth: 1, borderColor: '#eee' },
  qrSubText: { fontSize: 12, color: '#888', fontWeight: '500' },
  
  donationFooter: { fontSize: 13, color: '#666', textAlign: 'center', fontStyle: 'italic', marginBottom: 20 },
  
  directDonateBtn: { backgroundColor: '#10B981', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, elevation: 3, flexDirection: 'row', alignItems: 'center', marginBottom: 15, width: '100%', justifyContent: 'center' },
  directDonateBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  
  donationCloseBtn: { padding: 10 },
  donationCloseText: { color: '#999', fontSize: 14, fontWeight: 'bold' },

  // About Modal Styles
  centerModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  aboutCard: { backgroundColor: '#fff', width: '90%', borderRadius: 25, overflow: 'hidden', elevation: 15, maxHeight: '85%' },
  aboutHeader: { padding: 25, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  headerCloseIcon: { position: 'absolute', top: 20, right: 20, zIndex: 10, padding: 5 },
  headerCloseText: { color: 'rgba(255,255,255,0.8)', fontSize: 24, fontWeight: 'bold' },
  aboutEmoji: { fontSize: 45, marginBottom: 5 },
  aboutTitle: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
  
  aboutContent: { padding: 25 },
  aboutHeaderTitle: { fontSize: 20, fontWeight: 'bold', color: '#D35400', marginBottom: 15 },
  aboutText: { fontSize: 16, color: '#555', marginBottom: 15, lineHeight: 26, textAlign: 'left' },
  
  missionBox: { backgroundColor: '#FFF5E6', padding: 15, borderRadius: 10, marginVertical: 10, alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#FF9933' },
  missionText: { fontSize: 18, fontWeight: 'bold', color: '#D35400', fontStyle: 'italic' },
  
  contactContainer: { backgroundColor: '#F9F9F9', borderRadius: 15, padding: 20, marginTop: 10, marginBottom: 10 },
  contactRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  contactIcon: { fontSize: 20, marginRight: 15 },
  contactText: { fontSize: 16, color: '#333', fontWeight: '500' },
  
  aboutFooter: { textAlign: 'center', color: '#999', fontSize: 12, marginTop: 20, marginBottom: 10 },
  
  closeButton: { backgroundColor: '#FF9933', paddingVertical: 15, alignItems: 'center' },
  closeButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },

  rowActions: { flexDirection: 'row', alignItems: 'center' },
  notifButton: { padding: 10, marginRight: 5 },
  notifIcon: { fontSize: 20, color: '#ccc' },

  // Profile Styles
  profileAvatarLarge: {
      width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff',
      justifyContent: 'center', alignItems: 'center', marginBottom: 10,
      elevation: 5
  },
  profileAvatarText: { fontSize: 35, fontWeight: 'bold', color: '#FF9933' },
  profileInfoRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  profileInfoLabel: { fontSize: 14, color: '#999', fontWeight: '500', marginBottom: 4 },
  profileInfoValue: { fontSize: 16, color: '#333', fontWeight: '600' },
  verifiedBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  verifiedText: { color: '#2E7D32', fontSize: 12, fontWeight: 'bold' },
  logoutActionBtn: {
      backgroundColor: '#FFF0F0', padding: 12, borderRadius: 12, 
      alignItems: 'center', borderWidth: 1, borderColor: '#FFCDD2',
      marginBottom: 10
  },
  logoutActionText: { color: '#C62828', fontWeight: 'bold', fontSize: 16 },

  // New Profile Styles
  profileEditSection: { marginBottom: 20 },
  profileInput: {
      borderWidth: 1, borderColor: '#DDD', borderRadius: 10,
      padding: 12, fontSize: 16, color: '#333', backgroundColor: '#F9F9F9',
      marginTop: 8
  },
  premiumUpdateBtn: {
      backgroundColor: '#FF9933', padding: 15, borderRadius: 12,
      alignItems: 'center', marginTop: 20, elevation: 3
  },
  updateBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  // Rating Modal Styles
  ratingCard: { backgroundColor: '#fff', width: '85%', borderRadius: 20, overflow: 'hidden', elevation: 10 },
  ratingHeader: { padding: 25, alignItems: 'center' },
  ratingEmoji: { fontSize: 40, marginBottom: 5 },
  ratingTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  ratingContent: { padding: 25, alignItems: 'center' },
  ratingText: { fontSize: 16, color: '#555', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  starsRow: { flexDirection: 'row', marginBottom: 25 },
  starIcon: { fontSize: 45, color: '#DDD', marginHorizontal: 5 },
  ratingCloseBtn: { marginTop: 15, padding: 5 },
  ratingCloseText: { color: '#999', fontSize: 14, fontWeight: '500' },
  
  profileRatingBadge: { backgroundColor: '#FFF9C4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#FBC02D' },
  profileRatingText: { color: '#F57F17', fontSize: 12, fontWeight: 'bold' },

  // Suggestion Styles
  suggestionCard: { backgroundColor: '#fff', width: '90%', borderRadius: 25, overflow: 'hidden', elevation: 15, maxHeight: '80%' },
  suggestionHeader: { padding: 20, alignItems: 'center' },
  suggestionEmoji: { fontSize: 35, marginBottom: 5 },
  suggestionTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  suggestionContent: { padding: 25 },
  suggestionSubTitle: { fontSize: 16, fontWeight: 'bold', color: '#D35400', marginBottom: 10, marginTop: 10 },
  categoryWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
  catChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F0F0F0', marginRight: 10, marginBottom: 10, borderWidth: 1, borderColor: '#DDD' },
  catChipActive: { backgroundColor: '#FF9933', borderColor: '#FF9933' },
  catChipText: { fontSize: 14, color: '#666' },
  catChipTextActive: { color: '#fff', fontWeight: 'bold' },
  suggestionInput: { borderWidth: 1, borderColor: '#DDD', borderRadius: 12, padding: 15, fontSize: 16, minHeight: 120, backgroundColor: '#FAFAFA', color: '#333', textAlignVertical: 'top' },
  suggestionCloseBtn: { marginTop: 15, alignItems: 'center', padding: 10 },
  suggestionCloseText: { color: '#999', fontSize: 14, fontWeight: '500' },

  // Admin Dashboard Styles
  adminCard: { backgroundColor: '#f8fafc', width: '95%', borderRadius: 30, overflow: 'hidden', elevation: 25, maxHeight: '92%' },
  adminHeader: { padding: 30, paddingBottom: 25, position: 'relative' },
  adminHeaderInfo: { marginTop: 5 },
  adminTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', letterSpacing: 0.5 },
  adminSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  
  adminTabWrapper: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  adminTabScroll: { paddingHorizontal: 15, paddingVertical: 12 },
  premiumTab: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, marginRight: 8, backgroundColor: '#f1f5f9' },
  premiumTabActive: { backgroundColor: '#6366f1' },
  premiumTabText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  premiumTabTextActive: { color: '#fff' },
  
  adminContent: { padding: 20 },
  adminSectionBody: { flex: 1 },
  adminLoader: { padding: 40, alignItems: 'center' },
  
  suggestionItem: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 15, 
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
  suggestionTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  userAvatar: { width: 45, height: 45, borderRadius: 15, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarLetter: { fontSize: 20, fontWeight: 'bold', color: '#64748b' },
  userInfo: { flex: 1 },
  suggestionBadgesRow: { flexDirection: 'row', marginBottom: 15, flexWrap: 'wrap' },
  adminListHeader: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 2 },
  adminListSub: { fontSize: 12, color: '#64748b' },
  statusBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginRight: 8, marginBottom: 5 },
  statusText: { fontSize: 11, color: '#d97706', fontWeight: 'bold' },
  suggestionBody: { marginBottom: 15 },
  adminListText: { fontSize: 14, color: '#334155', lineHeight: 22 },
  suggestionFooter: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  adminDate: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' },
  suggestionActionBtn: { backgroundColor: '#e0f2fe', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#bae6fd' },
  suggestionActionText: { color: '#0369a1', fontSize: 11, fontWeight: 'bold' },
  
  audioBtn: { marginTop: 10, borderRadius: 12, overflow: 'hidden', elevation: 3, width: 140 },
  audioBtnActive: { elevation: 1 },
  audioGradient: { paddingVertical: 8, paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  audioBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  ratingListItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 18, borderRadius: 20, marginBottom: 12, elevation: 2 },
  adminRatingInfo: { flex: 1 },
  starBadge: { backgroundColor: '#fff9c4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#fef08a' },
  starBadgeText: { fontSize: 14, fontWeight: 'bold', color: '#a16207' },
  
  manageItem: { flexDirection: 'column', backgroundColor: '#fff', padding: 20, borderRadius: 20, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
  manageActions: { flexDirection: 'row', gap: 10, marginTop: 15, flexWrap: 'wrap' },
  actionBtnEdit: { backgroundColor: '#f1f5f9', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12 },
  actionBtnAI: { backgroundColor: '#eef2ff', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#e0e7ff' },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: '#4338ca' },
  
  formContainer: { paddingBottom: 20 },
  formSection: { marginBottom: 25, backgroundColor: '#fff', padding: 20, borderRadius: 20, elevation: 1 },
  formSectionTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 15 },
  aiGenerateWrapper: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  premiumAdminInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 14, color: '#1e293b' },
  premiumAiBtn: { height: 50, borderRadius: 12, overflow: 'hidden', minWidth: 100 },
  aiBtnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 15 },
  aiBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  
  mainSubmitBtn: { height: 55, borderRadius: 15, overflow: 'hidden', marginTop: 10, elevation: 4 },
  submitBtnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5 },
  
  emptyContainer: { padding: 50, alignItems: 'center' },
  emptyIcon: { fontSize: 50, marginBottom: 15 },
  emptyText: { fontSize: 16, color: '#94a3b8', fontWeight: '500' },

  // Divine Guide Styles
  guideHeader: { padding: 15, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  guideHeaderEmoji: { fontSize: 24, marginRight: 12 },
  guideHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  guideContent: { padding: 15 },
  guideSection: { marginBottom: 20, backgroundColor: '#fdfdfd', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#f0f0f0' },
  guideSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#D35400', marginBottom: 8 },
  guideText: { fontSize: 14, color: '#444', lineHeight: 22 },
  
  // AI Button (Legacy - will clean up eventually)
  aiButton: { backgroundColor: '#D35400', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 10, justifyContent: 'center', alignItems: 'center', minWidth: 80, height: 46, marginBottom: 0 },
  aiButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },

  // Journey Guide Modal Styles
  journeyGuideCard: { 
    backgroundColor: '#fff', 
    width: '90%', 
    maxWidth: 500,
    borderRadius: 25, 
    overflow: 'hidden', 
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    maxHeight: '85%' 
  },
  journeyHeader: { 
    padding: 35,
    paddingTop: 45,
    paddingBottom: 30,
    alignItems: 'center',
    position: 'relative'
  },
  journeyCloseBtn: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  journeyCloseText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold'
  },
  journeyHeaderIconContainer: {
    marginBottom: 18
  },
  journeyHeaderIconGlow: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10
  },
  journeyHeaderIcon: {
    width: 75,
    height: 75,
    borderRadius: 37.5,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10
  },
  journeyIconText: {
    fontSize: 40
  },
  journeyTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.8,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4
  },
  journeyHeaderSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontStyle: 'italic',
    letterSpacing: 0.5
  },
  journeyScrollContent: {
    padding: 25,
    paddingTop: 20
  },
  journeySubtitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#667eea',
    marginBottom: 25,
    textAlign: 'center',
    letterSpacing: 0.5
  },
  journeyInputSection: {
    marginBottom: 20
  },
  journeyInputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  journeyInputLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4B5563',
    flex: 1
  },
  useCurrentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    elevation: 2,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  useCurrentIcon: {
    fontSize: 14,
    marginRight: 4
  },
  useCurrentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5'
  },
  chooseTempleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4E6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD699'
  },
  chooseTempleIcon: {
    fontSize: 14,
    marginRight: 4
  },
  chooseTempleText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#CC6600'
  },
  journeyInputWrapper: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4
  },
  journeyInput: {
    padding: 16,
    fontSize: 15,
    color: '#1F2937',
    backgroundColor: 'transparent',
    fontWeight: '500'
  },
  revealPathBtn: {
    marginTop: 25,
    marginBottom: 10,
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12
  },
  revealPathGradient: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  revealPathIcon: {
    fontSize: 20,
    marginRight: 8
  },
  revealPathText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.5
  },
  journeyCloseBottomBtn: {
    marginTop: 20,
    marginBottom: 40,
    alignItems: 'center',
    padding: 12
  },
  journeyCloseBottomText: {
    color: '#999',
    fontSize: 15,
    fontWeight: '600'
  },
  journeyInputHint: {
    fontSize: 12,
    color: '#888',
    marginTop: 6,
    fontStyle: 'italic',
    paddingLeft: 4
  },
  travelModeButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    minHeight: 110
  },
  travelModeButtonActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4338ca',
    elevation: 4,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  travelModeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 2
  },
  travelModeTextActive: {
    color: '#fff'
  },
  travelModeSubtext: {
    fontSize: 10,
    color: '#9CA3AF'
  },
  pickMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A5D6A7'
  },
  pickMapIcon: {
    fontSize: 14,
    marginRight: 4
  },
  pickMapText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2E7D32'
  },
  
  // Map Preview Styles
  mapPreviewCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#BAE6FD',
    elevation: 3,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  mapPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  mapPreviewIcon: {
    fontSize: 28,
    marginRight: 12
  },
  mapPreviewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0C4A6E',
    marginBottom: 2
  },
  mapPreviewSubtitle: {
    fontSize: 13,
    color: '#0369A1',
    fontWeight: '600'
  },
  mapContainer: {
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD'
  },
  mapActions: {
    marginBottom: 8
  },
  mapActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#34A853',
    elevation: 2,
    shadowColor: '#34A853',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4
  },
  mapActionIcon: {
    fontSize: 16,
    marginRight: 8
  },
  mapActionText: {
    color: '#34A853',
    fontSize: 14,
    fontWeight: 'bold'
  },
  viewMapBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#34A853',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    marginBottom: 10
  },
  viewMapGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16
  },
  viewMapIcon: {
    fontSize: 18,
    marginRight: 8
  },
  viewMapText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center'
  },
  viewMapArrow: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold'
  },
  mapPreviewNote: {
    fontSize: 11,
    color: '#0369A1',
    textAlign: 'center',
    fontStyle: 'italic'
  },
  // Route Info Hint Styles
  routeInfoHint: {
    flexDirection: 'row',
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    elevation: 2,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6
  },
  routeInfoIcon: {
    fontSize: 32,
    marginRight: 12,
    marginTop: 2
  },
  routeInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 6
  },
  routeInfoText: {
    fontSize: 13,
    color: '#B45309',
    lineHeight: 20
  },
  
  // Guide Premium List Styles - Redesigned
  guideListCard: { backgroundColor: '#f8fafc', width: '95%', borderRadius: 35, overflow: 'hidden', elevation: 25, height: '85%' },
  guideHeaderPremium: { padding: 25, paddingBottom: 25 },
  guideHeaderTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  guideTopCloseBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  guideTopCloseText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  guideHeaderIconBadge: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  guideMainTitle: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  guideMainSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  
  guideListBody: { flex: 1, backgroundColor: '#f8fafc' },
  guideDistrictHeader: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 25, paddingVertical: 18, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9'
  },
  guideDistrictLabel: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1 },
  guideDistrictValue: { fontSize: 15, fontWeight: '800', color: '#1e293b', marginTop: 2 },
  guideCountBadge: { backgroundColor: '#f0f9ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#e0f2fe' },
  guideCountText: { fontSize: 11, fontWeight: '900', color: '#0369a1' },
  
  guideLoadingState: { padding: 80, alignItems: 'center' },
  guideLoadingText: { marginTop: 15, color: '#64748b', fontSize: 14, fontWeight: '600' },
  
  premiumGuideItem: { 
    backgroundColor: '#fff', borderRadius: 28, padding: 18, marginBottom: 20,
    borderWidth: 1, borderColor: '#f1f5f9', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 15
  },
  guideItemTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  guideAvatarWrapper: { position: 'relative' },
  guideAvatarGradient: { width: 64, height: 64, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  guideAvatarText: { fontSize: 26, fontWeight: 'bold', color: '#2563eb' },
  miniVerifyBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#2563eb', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  
  guideMainInfo: { flex: 1, marginLeft: 18 },
  guideItemName: { fontSize: 19, fontWeight: '900', color: '#1e293b' },
  guideRatingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  guideStarText: { fontSize: 10, letterSpacing: -1, color: '#fbbf24' },
  guideRatingValue: { fontSize: 12, fontWeight: '800', color: '#475569', marginLeft: 6 },
  
  guideTagsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  guideTypeTag: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  tagDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', marginHorizontal: 8 },
  
  guideDetailsCard: { backgroundColor: '#f8fafc', borderRadius: 20, padding: 15, marginBottom: 15 },
  guideQuickStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  guideStatBox: { flex: 1, alignItems: 'center' },
  guideStatValue: { fontSize: 14, fontWeight: '900', color: '#334155' },
  guideStatTitle: { fontSize: 10, color: '#94a3b8', fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
  guideVerticalLine: { width: 1, height: 25, backgroundColor: '#e2e8f0' },
  
  guideInfoStrip: { backgroundColor: '#fff', padding: 8, borderRadius: 10, marginBottom: 10, alignSelf: 'flex-start' },
  guideStripText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  guideBioSmall: { fontSize: 13, color: '#475569', lineHeight: 20, fontStyle: 'italic', marginBottom: 12 },
  
  guideFooterStrip: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eef2f6' },
  guideLangLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8', marginRight: 6 },
  guideLangVal: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  
  guideActionRow: { flexDirection: 'row', gap: 12 },
  guideActionCall: { 
    flex: 1, flexDirection: 'row', backgroundColor: '#fff', 
    paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#e2e8f0'
  },
  guideActionBtnText: { color: '#1e293b', fontWeight: '900', fontSize: 14, marginLeft: 8 },
  guideActionWhatsapp: { 
    flex: 1.5, flexDirection: 'row', backgroundColor: '#10b981', 
    paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8
  },
  
  guideEmptyState: { padding: 50, alignItems: 'center', flex: 1, justifyContent: 'center' },
  guideEmptyIconCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#fff', elevation: 5, justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
  guideEmptyTitle: { fontSize: 22, fontWeight: '900', color: '#1e293b', marginBottom: 12, textAlign: 'center' },
  guideEmptySub: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22, marginBottom: 30 },
  guideRegisterBtn: { width: '100%', height: 58, borderRadius: 18, overflow: 'hidden', elevation: 5 },
  guideRegGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  guideRegBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  
  guideModalBottomBtn: { paddingVertical: 20, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', backgroundColor: '#fff' },
  guideModalBottomText: { color: '#94a3b8', fontWeight: '900', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' },

  // Booking Styles
  guidePrimaryBookBtn: { marginTop: 15, borderRadius: 16, overflow: 'hidden', elevation: 3 },
  guideBookGradient: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  guideBookBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  bookingCard: { backgroundColor: '#fff', width: '90%', borderRadius: 25, overflow: 'hidden', elevation: 20 },
  bookingHeader: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bookingTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  bookingContent: { padding: 20 },
  bookingGuideInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 15, borderRadius: 15, marginBottom: 20 },
  smallAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center' },
  bookingGuideName: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  bookingGuideDistrict: { fontSize: 12, color: '#64748b' },
  bookingPriceBadge: { marginLeft: 'auto', backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  bookingPrice: { fontSize: 12, fontWeight: 'bold', color: '#166534' },
  bookingForm: { marginBottom: 20 },
  bookingLabel: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 8 },
  bookingInput: { backgroundColor: '#f1f5f9', borderRadius: 12, padding: 15, fontSize: 16, color: '#1e293b', borderWidth: 1, borderColor: '#e2e8f0' },
  bookingSummary: { marginTop: 20, padding: 15, backgroundColor: '#f8fafc', borderRadius: 12, gap: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 12, color: '#94a3b8' },
  summaryValue: { fontSize: 12, fontWeight: 'bold', color: '#334155', flex: 1, textAlign: 'right', marginLeft: 10 },
  confirmBookingBtn: { backgroundColor: '#4f46e5', paddingVertical: 16, borderRadius: 15, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  confirmBookingText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  bookingSecureNote: { textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 15 }
});

