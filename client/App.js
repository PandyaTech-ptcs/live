import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, RefreshControl, Platform, TouchableOpacity, Image, LogBox, useWindowDimensions, TextInput, Alert, KeyboardAvoidingView, Modal } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// Suppress warning/error popups on the device screen
LogBox.ignoreAllLogs();
import YoutubePlayer from 'react-native-youtube-iframe';
import { LinearGradient } from 'expo-linear-gradient';
import * as ScreenOrientation from 'expo-screen-orientation';

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
const API_URL = 'https://343b1e48d983.ngrok-free.app/api/temples';

// FALLBACK_DATA (Offline Mode - Updated with latest Live IDs)
const FALLBACK_DATA = [
    {
        state: "ગુજરાત",
        temples: [
            { name: "દ્વારકાધીશ મંદિર – દ્વારકા", description: "Dwarkadhish Temple", liveVideoId: "6n03ntTsgY8", location: "Dwarka, Gujarat", liveChannelUrl: "https://www.youtube.com/@shridwarkadhishmandirofficial/live", history: "દ્વારકાધીશ મંદિર, જેને જગત મંદિર તરીકે પણ ઓળખવામાં આવે છે, તે ભગવાન કૃષ્ણને સમર્પિત ચાલુક્ય શૈલીનું હિન્દુ મંદિર છે. 5 માળની ઇમારતનું મુખ્ય મંદિર, જે 72 સ્તંભો દ્વારા સપોર્ટેડ છે, તેને જગત મંદિર અથવા નિજા મંદિર તરીકે ઓળખવામાં આવે છે." },
            { name: "સોમનાથ મહાદેવ – સોમનાથ", description: "Somnath Jyotirlinga", liveVideoId: "-2yFWlIB1Zs", location: "Veraval, Gujarat", history: "સોમનાથ ભગવાન શિવના 12 જ્યોતિર્લિંગોમાંનું પ્રથમ છે. આ મંદિર પ્રભાસ પાટણમાં આવેલું છે. દંતકથા કહે છે કે ચંદ્રદેવ (સોમ) એ સોનામાં, રાવણે ચાંદીમાં અને શ્રીકૃષ્ણે સુખડમાં આ મંદિર બનાવ્યું હતું." }, 
            { name: "રણછોડરાયજી – ડાકોર", description: "Ranchhodraiji Temple", liveVideoId: "53JgXelmHsg", location: "Dakor, Gujarat", liveChannelUrl: "https://www.youtube.com/c/RanchhodraijiLiveDarshanDakor/live", history: "રણછોડરાયજીનું મુખ્ય મંદિર 1772 એ.ડી.માં શ્રી ગોપાલરાવ જગન્નાથ તાંબેકર દ્વારા બાંધવામાં આવ્યું હતું. દંતકથા છે કે બોડાણા નામનો ભક્ત, જે દર વર્ષે ડાકોરથી દ્વારકા ચાલીને જતો હતો, તે ભગવાનને અહીં લાવ્યો હતો." },
            { name: "નાગેશ્વર મહાદેવ – દ્વારકા", description: "Nageshwar Jyotirlinga", liveVideoId: "PRE-RECORDED_VIDEO_ID", location: "Dwarka, Gujarat", history: "નાગેશ્વર જ્યોતિર્લિંગ 12 જ્યોતિર્લિંગોમાંનું એક છે. ભગવાન શિવ રાક્ષસ દારુકાને પરાજિત કરવા અને તેમના ભક્ત સુપ્રિયાનું રક્ષણ કરવા માટે અહીં પ્રગટ થયા હતા." },
            { name: "સ્વામિનારાયણ મંદિર – વડતાલ", description: "Swaminarayan Temple Vadtal", liveVideoId: "PRE-RECORDED_VIDEO_ID", location: "Vadtal, Gujarat", history: "ભગવાન સ્વામિનારાયણે પોતે 1824 માં અહીં લક્ષ્મીનારાયણ દેવની મૂર્તિઓ સ્થાપિત કરી હતી. તે શ્રી લક્ષ્મીનારાયણ દેવ ગાદીનું મુખ્ય મથક છે." },
            { name: "સ્વામિનારાયણ મંદિર – કાલુપુર", description: "Kalupur Swaminarayan Mandir", liveVideoId: "PRE-RECORDED_VIDEO_ID", location: "Ahmedabad, Gujarat", history: "આ સ્વામિનારાયણ સંપ્રદાયનું પ્રથમ મંદિર છે, જે 1822 માં બનાવવામાં આવ્યું હતું. તે જટિલ લાકડાની કોતરણી અને સ્થાપત્યનો શ્રેષ્ઠ નમૂનો છે." },
            { name: "ISKCON – અમદાવાદ", description: "ISKCON Ahmedabad", liveVideoId: "PRE-RECORDED_VIDEO_ID", location: "Ahmedabad, Gujarat", history: "ઇસ્કોન અમદાવાદ, જે હરે કૃષ્ણ મંદિર તરીકે ઓળખાય છે, તે રાધા અને ગોવિંદને સમર્પિત છે. તે આધ્યાત્મિક શિક્ષણ અને વૈદિક સંસ્કૃતિનું કેન્દ્ર છે." },
            { name: "ISKCON – રાજકોટ", description: "ISKCON Rajkot", liveVideoId: "PRE-RECORDED_VIDEO_ID", location: "Rajkot, Gujarat", history: "ઇસ્કોન રાજકોટ (શ્રી શ્રી રાધા નીલમાધવ ધામ) એ રાજકોટમાં આધ્યાત્મિક ઓએસિસ તરીકે સેવા આપતું એક સુંદર મંદિર સંકુલ છે." },
            { name: "ખોડિયાર મંદિર - ભાવનગર રાજપરા", description: "Khodiyar Maa Rajpara", liveVideoId: "DWjV3Xm565g", location: "Bhavnagar, Gujarat", history: "આ મંદિર તાંતણીયા ધરા પાસે આવેલું છે. રાજપરાનું મંદિર મહત્વનું છે કારણ કે દેવી જુનાગઢના શાસક રા'નવઘણને મદદ કરવા માટે અહીં પ્રગટ થયા હોવાનું માનવામાં આવે છે." },
        ]
    },
    {
        state: "મહારાષ્ટ્ર",
        temples: [
            { name: "સિદ્ધિવિનાયક ગણપતિ – મુંબઈ", description: "Siddhivinayak Temple", liveVideoId: "PRE-RECORDED_VIDEO_ID", location: "Mumbai, Maharashtra", history: "સિદ્ધિવિનાયક મંદિર મૂળરૂપે 1801 માં લક્ષ્મણ વિથુ અને દેઉબાઈ પાટીલ દ્વારા બનાવવામાં આવ્યું હતું. અહીં ગણેશજીની મૂર્તિની સૂંઢ જમણી બાજુ છે." },
            { name: "દગડુશેઠ ગણપતિ – પુણે", description: "Dagdusheth Halwai Ganpati", liveVideoId: "PRE-RECORDED_VIDEO_ID", location: "Pune, Maharashtra", history: "પ્લેગમાં પુત્ર ગુમાવ્યા બાદ મીઠાઈ વેચનાર દગડુશેઠ હલવાઈ દ્વારા નિર્મિત. અહીંની ગણેશ પ્રતિમા ખૂબ જ પ્રખ્યાત છે." },
            { name: "શિરડી સાઈ બાબા મંદિર", description: "Shirdi Sai Baba", liveVideoId: "4-PkAQKpMkM", location: "Shirdi, Maharashtra", history: "શિરડી મહાન સંત સાઈ બાબાનું ઘર છે, જેઓ 50 વર્ષથી વધુ સમય સુધી અહીં રહ્યા હતા. તેમણે 'સૌનો માલિક એક'નું સાર્વત્રિક સૂત્ર શીખવ્યું હતું." },
            { name: "શનિ શિંગણાપુર", description: "Shani Shingnapur", liveVideoId: "PRE-RECORDED_VIDEO_ID", location: "Ahmednagar, Maharashtra", history: "આ ગામ પ્રખ્યાત છે કારણ કે કોઈ પણ ઘરને દરવાજા નથી. દેવતા સ્વયંભૂ કાળા પથ્થર છે જે ખુલ્લા પ્લેટફોર્મ પર ઉભા છે." },
            { name: "ત્ર્યંબકેશ્વર જ્યોતિર્લિંગ – નાશિક", description: "Trimbakeshwar Jyotirlinga", liveVideoId: "PRE-RECORDED_VIDEO_ID", location: "Nashik, Maharashtra", history: "ત્ર્યંબકેશ્વર 12 જ્યોતિર્લિંગોમાંનું એક છે અને ગોદાવરી નદીનું ઉદગમ સ્થાન છે. આ જ્યોતિર્લિંગની વિશિષ્ટતા તેના ત્રણ ચહેરા છે." },
            { name: "ભીમાશંકર જ્યોતિર્લિંગ", description: "Bhimashankar Jyotirlinga", liveVideoId: "PRE-RECORDED_VIDEO_ID", location: "Pune, Maharashtra", history: "સહ્યાદ્રિ પર્વતમાળામાં આવેલું ભીમાશંકર બીજું એક જ્યોતિર્લિંગ છે. દંતકથા વર્ણવે છે કે કેવી રીતે ભગવાન શિવે અહીં ત્રિપુરાસુર રાક્ષસનો નાશ કર્યો હતો." },
        ]
    },
    {
        state: "મધ્યપ્રદેશ",
        temples: [
            { name: "મહાકાળેશ્વર મંદિર – ઉજ્જૈન", description: "Mahakaleshwar Jyotirlinga", liveVideoId: "30Myx5zl7_I", location: "Ujjain, MP", history: "મહાકાલેશ્વર એકમાત્ર સ્વયંભૂ જ્યોતિર્લિંગ છે જ્યાં મૂર્તિ દક્ષિણ મુખી (દક્ષિણામૂર્તિ) છે. અહીંની ભસ્મ આરતી વિશ્વ પ્રસિદ્ધ છે." },
            { name: "ઓંકારેશ્વર જ્યોતિર્લિંગ", description: "Omkareshwar Jyotirlinga", liveVideoId: "ApUGemfYdTc", location: "Khandwa, MP", history: "ઓંકારેશ્વર નર્મદા નદીમાં માંધાતા નામના ટાપુ પર આવેલું છે, જેનો આકાર 'ઓમ' પ્રતીક જેવો છે. તે 12 જ્યોતિર્લિંગોમાંનું એક છે." },
        ]
    },
    {
        state: "ઉત્તર પ્રદેશ",
        temples: [
            { name: "કાશી વિશ્વનાથ મંદિર – વારાણસી", description: "Kashi Vishwanath", liveVideoId: "PRE-RECORDED_VIDEO_ID", location: "Varanasi, UP", history: "વારાણસીમાં ગંગાના કિનારે આવેલું, આ સૌથી પવિત્ર શિવ મંદિરોમાંનું એક છે. વર્તમાન માળખું 1780માં અહલ્યાબાઈ હોલકરે બનાવ્યું હતું." },
            { name: "વૃંદાવન ISKCON મંદિર", description: "ISKCON Vrindavan", liveVideoId: "PRE-RECORDED_VIDEO_ID", location: "Vrindavan, UP", history: "કૃષ્ણ બલરામ મંદિર તરીકે પણ ઓળખાય છે, તે ભારતના મુખ્ય ઇસ્કોન મંદિરોમાંનું એક છે, જે 1975 માં ખોલવામાં આવ્યું હતું." },
            { name: "બાંકે બિહારી", description: "Banke Bihari", liveVideoId: "PRE-RECORDED_VIDEO_ID", location: "Vrindavan, UP", history: "ભગવાન કૃષ્ણને સમર્પિત, અહીંની મૂર્તિ ત્રિભંગ મુદ્રામાં ઊભી છે. ભક્તોને તીવ્ર આંખોથી બચાવવા માટે પડદો વારંવાર બંધ અને ખોલવામાં આવે છે." },
        ]
    },
    {
        state: "આંધ્ર પ્રદેશ",
        temples: [
            { name: "તિરુપતિ બાલાજી મંદિર – તિરુમલા", description: "Tirumala Venkateswara", liveVideoId: "PRE-RECORDED_VIDEO_ID", location: "Tirumala, AP", history: "વિષ્ણુના અવતાર ભગવાન વેંકટેશ્વરને સમર્પિત એક સીમાચિહ્નરૂપ વૈષ્ણવ મંદિર. દાનની દ્રષ્ટિએ તે વિશ્વનું સૌથી ધનિક મંદિર છે." },
            { name: "શ્રી કાલહસ્તી મંદિર", description: "Srikalahasti Temple", liveVideoId: "PRE-RECORDED_VIDEO_ID", location: "Srikalahasti, AP", history: "તેના વાયુ લિંગ માટે પ્રખ્યાત છે, જે પંચ ભૂત સ્થળોમાંનું એક છે. દંતકથામાં સ્પાઈડર, સાપ અને હાથીનો સમાવેશ થાય છે." },
        ]
    },
    {
        state: "ઓડિશા",
        temples: [
            { name: "જગન્નાથ મંદિર – પુરી", description: "Jagannath Temple", liveVideoId: "PRE-RECORDED_VIDEO_ID", location: "Puri, Odisha", history: "વાર્ષિક રથયાત્રા માટે પ્રખ્યાત. આ મંદિર ભગવાન જગન્નાથ, બલભદ્ર અને સુભદ્રાને સમર્પિત છે." },
        ]
    },
    {
        state: "રાજસ્થાન",
        temples: [
            { name: "શ્રીનાથજી મંદિર – નાથદ્વારા", description: "Shrinathji Temple", liveVideoId: "PRE-RECORDED_VIDEO_ID", location: "Nathdwara, Rajasthan", history: "આ મંદિરમાં ગોવર્ધન પર્વતને ઉંચકતા 7 વર્ષના કૃષ્ણની મૂર્તિ છે. 17મી સદીમાં આ મૂર્તિ મથુરાથી અહીં લાવવામાં આવી હતી." },
            { name: "સાલાસર બાલાજી", description: "Salasar Balaji", liveVideoId: "PRE-RECORDED_VIDEO_ID", location: "Salasar, Rajasthan", history: "ભગવાન હનુમાનને સમર્પિત. તે અનોખું છે કારણ કે અહીં હનુમાનજીની ગોળ ચહેરા અને દાઢી/મૂછ સાથે પૂજા કરવામાં આવે છે." },
        ]
    },
    {
        state: "તમિલનાડુ",
        temples: [
            { name: "મીનાક્ષી અમ્મન મંદિર – મદુરાઈ", description: "Meenakshi Temple", liveVideoId: "PRE-RECORDED_VIDEO_ID", location: "Madurai, TN", history: "વૈગાઈ નદીના કિનારે આવેલું એક ઐતિહાસિક હિન્દુ મંદિર. તે મિનાક્ષી અને તેમના પતિક સુંદરેશ્વરને સમર્પિત છે." },
            { name: "રમેશ્વરમ મંદિર", description: "Ramanathaswamy Temple", liveVideoId: "PRE-RECORDED_VIDEO_ID", location: "Rameswaram, TN", history: "રામનાથસ્વામી મંદિર 12 જ્યોતિર્લિંગોમાંનું એક છે. ભગવાન રામે રાવણને મારવાના પાપમાંથી મુક્તિ મેળવવા માટે અહીં શિવની પૂજા કરી હતી." },
        ]
    },
    {
        state: "કેરળ",
        temples: [
            { name: "ગુરુવાયુર શ્રી કૃષ્ણ મંદિર", description: "Guruvayur Temple", liveVideoId: "PRE-RECORDED_VIDEO_ID", location: "Guruvayur, Kerala", history: "ઘણીવાર 'દક્ષિણની દ્વારકા' કહેવાય છે. ગુરુવાયુરપ્પન (કૃષ્ણ) ની મૂર્તિ અહીં ગુરુ (બૃહસ્પતિ) અને વાયુ (પવન દેવ) દ્વારા સ્થાપિત કરવામાં આવી હતી." },
        ]
    },
    {
        state: "જમ્મુ & કાશ્મીર",
        temples: [
            { name: "વૈષ્ણો દેવી મંદિર – કટરા", description: "Vaishno Devi", liveVideoId: "PRE-RECORDED_VIDEO_ID", location: "Katra, J&K", history: "દેવી વૈષ્ણો દેવી અહીં પિંડી તરીકે ઓળખાતી ત્રણ કુદરતી ખડકોના રૂપમાં બિરાજમાન છે. તે તેના ભક્તોને શક્તિ પ્રદાન કરે છે." },
        ]
    },
    {
        state: "આસામ / પૂર્વ ભારત",
        temples: [
            { name: "કામાખ્યા દેવી મંદિર – આસામ", description: "Kamakhya Temple", liveVideoId: "PRE-RECORDED_VIDEO_ID", location: "Guwahati, Assam", history: "51 શક્તિપીઠોમાં સૌથી જૂનું. તે સતીની યોનિનું પ્રતિનિધિત્વ કરે છે. આ મંદિર અંબુબાચી મેળા માટે પ્રખ્યાત છે." },
            { name: "કાલી ઘાટ મંદિર – કોલકાતા", description: "Kalighat Temple", liveVideoId: "PRE-RECORDED_VIDEO_ID", location: "Kolkata, WB", history: "એક મુખ્ય શક્તિપીઠ જ્યાં સતીના જમણા પગનો અંગૂઠો પડ્યો હતો. આ મંદિર દેવી કાલીને સમર્પિત છે." },
        ]
    },
    {
        state: "પશ્ચિમ બંગાળ",
        temples: [
            { name: "ISKCON માયાપુર", description: "ISKCON Mayapur", liveVideoId: "PRE-RECORDED_VIDEO_ID", location: "Mayapur, WB", history: "માયાપુર ચૈતન્ય મહાપ્રભુનું જન્મસ્થળ છે. તે ઇસ્કોનનું મુખ્ય મથક છે. અહીં નિર્માણાધીન વૈદિક તારામંડળ મંદિર વિશ્વના સૌથી મોટા મંદિરોમાંનું એક હશે." }
        ]
    },
];

const AARTI_TIMINGS = {
    "દ્વારકાધીશ મંદિર – દ્વારકા": [{ h: 6, m: 30, label: "મંગલા આરતી" }, { h: 19, m: 30, label: "સંધ્યા આરતી" }],
    "સોમનાથ મહાદેવ – સોમનાથ": [{ h: 7, m: 0, label: "પ્રાતઃ આરતી" }, { h: 19, m: 0, label: "સંધ્યા આરતી" }],
    "રણછોડરાયજી – ડાકોર": [{ h: 6, m: 45, label: "મંગલા આરતી" }, { h: 19, m: 0, label: "સંધ્યા આરતી" }],
    "મહાકાળેશ્વર મંદિર – ઉજ્જૈન": [{ h: 4, m: 0, label: "ભસ્મ આરતી" }, { h: 19, m: 0, label: "સંધ્યા આરતી" }],
    "શિરડી સાઈ બાબા મંદિર": [{ h: 5, m: 15, label: "કાકડ આરતી" }, { h: 18, m: 0, label: "ધૂપ આરતી" }, { h: 22, m: 0, label: "શેજ આરતી" }],
    "વૈષ્ણો દેવી મંદિર – કટરા": [{ h: 6, m: 0, label: "પ્રાતઃ આરતી" }, { h: 19, m: 0, label: "સંધ્યા આરતી" }],
    "default": [{ h: 7, m: 0, label: "સવારની આરતી" }, { h: 19, m: 0, label: "સાંજની આરતી" }]
};

const LoginScreen = ({ onLogin }) => {
    const [name, setName] = useState('');
    const [contact, setContact] = useState('');

    const handleLogin = () => {
        if (!name.trim() || !contact.trim()) {
            Alert.alert("Error", "Please enter valid details");
            return;
        }
        onLogin({ name, contact });
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.loginContainer}
        >
            <View style={styles.loginCard}>
                <View style={styles.loginHeaderContainer}>
                     <Text style={styles.loginEmoji}>🕉️</Text>
                     <Text style={styles.loginTitle}>Divya Darshan</Text>
                     <Text style={styles.loginSubtitle}>Your Gateway to Spiritual Bliss</Text>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Full Name</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="Enter your name" 
                        value={name}
                        onChangeText={setName}
                        placeholderTextColor="#aaa"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Email ID / Mobile Number</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="Enter email or mobile" 
                        value={contact}
                        onChangeText={setContact}
                        placeholderTextColor="#aaa"
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>

                <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                    <Text style={styles.loginButtonText}>Register & Login</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.skipButton} onPress={() => onLogin(null)}>
                    <Text style={styles.skipButtonText}>Skip (Continue as Guest)</Text>
                </TouchableOpacity>

                <Text style={styles.footerNote}>By logging in, you agree to our T&C and Privacy Policy</Text>
            </View>
        </KeyboardAvoidingView>
    );
};

export default function App() {
  const [templeData, setTempleData] = useState([]); 
  const [selectedTemple, setSelectedTemple] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [language, setLanguage] = useState('gu'); // 'gu', 'hi', 'en'
  const [isCheckingLive, setIsCheckingLive] = useState(false); // To show "Checking..." status
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [reminders, setReminders] = useState([]); // List of temple names with reminders
  
  // Menu States
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isAboutVisible, setIsAboutVisible] = useState(false);
  
  // Hook must be at the top level
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  async function registerForPushNotificationsAsync() {
    let token;
    if (Device.isDevice) {
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
    } else {
      console.log('Must use physical device for Push Notifications');
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
  }

  const toggleReminder = async (templeName) => {
    if (reminders.includes(templeName)) {
      setReminders(prev => prev.filter(t => t !== templeName));
      await Notifications.cancelAllScheduledNotificationsAsync(); 
      Alert.alert("Reminder Removed", `You will no longer receive notifications for ${templeName} Aarti.`);
    } else {
      setReminders(prev => [...prev, templeName]);
      
      try {
          const timings = AARTI_TIMINGS[templeName] || AARTI_TIMINGS["default"];
          
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
                  hour: time.h,
                  minute: time.m,
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
      setUser(null);
      setIsLoggedIn(false);
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
      console.log('Fetch failed, using FALLBACK_DATA:', error.message);
      setTempleData(FALLBACK_DATA);
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

  // Auto-play when entering detail screen
  useEffect(() => {
    if (selectedTemple) {
        setPlaying(true);
        // Trigger live check if it's the live temple
        checkLiveStatus(selectedTemple);
    }
  }, [selectedTemple]);

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
      return (
          <View style={styles.container}>
             <StatusBar style="dark" />
             <LoginScreen onLogin={handleLogin} />
          </View>
      );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9933" />
        <Text style={styles.loadingText}>Loading Temples...</Text>
      </View>
    );
  }
  
  // const { width: windowWidth, height: windowHeight } = useWindowDimensions(); // MOVED UP

  // GANGA AARTI DATA (Special Section)
  const GANGA_AARTI_DATA = [
      { name: "Ganga Aarti – Varanasi", description: "Dashashwamedh Ghat", liveVideoId: "sAnF1hHBG30", location: "Varanasi, UP" },
      { name: "Ganga Aarti – Haridwar", description: "Har Ki Pauri", liveVideoId: "xVFWwqDFTmE", location: "Haridwar, UK" },
      { name: "Ganga Aarti – Rishikesh", description: "Parmarth Niketan", liveVideoId: "GdWUI3YQZJ0", location: "Rishikesh, UK" },
      { name: "Ganga Aarti – Rishikesh", description: "Triveni Ghat", liveVideoId: "K3Y9XkKBtj4", location: "Rishikesh, UK" }
  ];

  // RENDER: Selected Temple View (Detail)
  if (selectedTemple) {
      return (
        <View style={styles.container}>
            <StatusBar style="light" />
            
            {/* Header */}
            {!isFullScreen && (
            <LinearGradient colors={['#FF9933', '#FF512F']} style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {selectedTemple.name.split('–')[0].trim()}
                </Text> 
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
                            <Text style={styles.location}>📍 {selectedTemple.location}</Text>
                            <Text style={styles.description}>{selectedTemple.description}</Text>
                        </View>
                    )}
                </View>

                {!isFullScreen && (
                    <>
                    {/* Additional Placeholder Info */}
                    <View style={styles.card}>
                    <Text style={styles.sectionHeader}>About</Text>
                    
                    <View style={styles.langContainer}>
                        <TouchableOpacity onPress={() => setLanguage('gu')} style={[styles.langButton, language === 'gu' && styles.langButtonActive]}>
                            <Text style={[styles.langText, language === 'gu' && styles.langTextActive]}>ગુજરાતી</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setLanguage('hi')} style={[styles.langButton, language === 'hi' && styles.langButtonActive]}>
                            <Text style={[styles.langText, language === 'hi' && styles.langTextActive]}>हिंदी</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setLanguage('en')} style={[styles.langButton, language === 'en' && styles.langButtonActive]}>
                            <Text style={[styles.langText, language === 'en' && styles.langTextActive]}>English</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.infoText}>
                        { (language === 'en' && selectedTemple.history_en) ? selectedTemple.history_en :
                          (language === 'hi' && selectedTemple.history_hi) ? selectedTemple.history_hi :
                          (selectedTemple.history || `This is a famous pilgrimage site in ${selectedTemple.location.split(',')[1]}. Devotees visit here for peace and prosperity.`) }
                    </Text>
                </View>
                </>
                )}
            </ScrollView>
        </View>
      );
  }

  // RENDER: List of Temples (Home)
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#FF9933', '#FF512F']} style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={() => setIsMenuVisible(true)}>
            <Text style={styles.menuText}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Divya Darshan</Text>
        <Text style={styles.headerSubtitle}>
            Welcome, {user ? user.name : "Devotee"}
        </Text>
        <TouchableOpacity style={styles.logoutButton} onPress={user ? handleLogout : () => setIsLoggedIn(false)}>
            <Text style={styles.logoutText}>{user ? "Logout" : "Login"}</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF9933" />}
      >
        {/* Special Ganga Aarti Section */}
        <View style={styles.stateGroup}>
            <Text style={styles.stateTitle}>🔥 Special: Ganga Aarti</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {GANGA_AARTI_DATA.map((temple, index) => (
                    <TouchableOpacity 
                        key={index} 
                        style={styles.aartiCard}
                        onPress={() => setSelectedTemple(temple)}
                    >
                         <View style={styles.aartiIcon}>
                            <Text style={styles.aartiIconText}>🕉️</Text>
                        </View>
                        <Text style={styles.aartiName}>{temple.location.split(',')[0]}</Text>
                        <Text style={styles.aartiSubtext}>Tap to Watch</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>

        {templeData.map((group, groupIndex) => (
            <View key={groupIndex} style={styles.stateGroup}>
                <Text style={styles.stateTitle}>{group.state}</Text>
                {group.temples.map((temple, templeIndex) => (
                    <TouchableOpacity 
                        key={templeIndex} 
                        style={styles.templeRow}
                        onPress={() => setSelectedTemple(temple)}
                    >
                        <View style={styles.templeIcon}>
                            <Text style={styles.templeIconText}>🕉️</Text>
                        </View>
                        <View style={styles.templeInfo}>
                            <Text style={styles.templeName}>{temple.name.split('–')[0].trim()}</Text>
                            <Text style={styles.templeLocation}>{temple.location}</Text>
                        </View>
                        <View style={styles.rowActions}>
                            <TouchableOpacity 
                                style={styles.notifButton} 
                                onPress={(e) => {
                                    e.stopPropagation();
                                    toggleReminder(temple.name);
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
        ))}
         <View style={styles.footer}>
            <Text style={styles.footerText}>Made with ❤️ for Devotees</Text>
            <Text style={styles.footerText}>v1.1 (LAN Mode)</Text>
         </View>
      </ScrollView>

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
                
                <View style={styles.menuItems}>
                    <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMenuVisible(false); /* Navigate Profile */ }}>
                        <Text style={styles.menuIcon}>👤</Text>
                        <Text style={styles.menuLabel}>Profile</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMenuVisible(false); setIsAboutVisible(true); }}>
                        <Text style={styles.menuIcon}>ℹ️</Text>
                        <Text style={styles.menuLabel}>About Us</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMenuVisible(false); Alert.alert("Share", "Sharing App Link...") }}>
                        <Text style={styles.menuIcon}>📤</Text>
                        <Text style={styles.menuLabel}>Share App</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.menuItem} onPress={sendInstantNotification}>
                        <Text style={styles.menuIcon}>🔔</Text>
                        <Text style={styles.menuLabel}>Send Test Notif (Now)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMenuVisible(false); Alert.alert("Rate Us", "Thank you for rating 5 stars!") }}>
                        <Text style={styles.menuIcon}>⭐</Text>
                        <Text style={styles.menuLabel}>Rate Us</Text>
                    </TouchableOpacity>
                </View>
                
                <View style={styles.menuFooter}>
                    <Text style={styles.menuFooterText}>Version 1.2.0</Text>
                </View>
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
  backButton: { position: 'absolute', top: 60, left: 20, zIndex: 10 },
  backButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  content: { padding: 16 },
  detailContent: { padding: 16 },

  // List Styles
  stateGroup: { marginBottom: 25 },
  stateTitle: { fontSize: 20, fontWeight: 'bold', color: '#D35400', marginBottom: 10, marginLeft: 5 },
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
  description: { fontSize: 16, color: '#333', lineHeight: 24 },
  
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
  
  // Language Button Styles
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
  loginContainer: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
      backgroundColor: '#FFF5E6',
  },
  loginCard: {
      backgroundColor: '#fff',
      borderRadius: 20,
      padding: 30,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
  },
  loginHeaderContainer: { alignItems: 'center', marginBottom: 30 },
  loginEmoji: { fontSize: 50, marginBottom: 10 },
  loginTitle: { fontSize: 28, fontWeight: 'bold', color: '#D35400' },
  loginSubtitle: { fontSize: 14, color: '#666', marginTop: 5 },
  
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: {
      backgroundColor: '#F9F9F9',
      borderWidth: 1,
      borderColor: '#DDD',
      borderRadius: 10,
      padding: 15,
      fontSize: 16,
      color: '#333'
  },
  loginButton: {
      backgroundColor: '#FF9933',
      padding: 15,
      borderRadius: 10,
      alignItems: 'center',
      marginTop: 10,
      elevation: 2
  },
  loginButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  footerNote: { textAlign: 'center', color: '#999', fontSize: 12, marginTop: 20 },
  
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
});
