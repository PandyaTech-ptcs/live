const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// Data for all Temples grouped by State
const TEMPLE_DATA = [
    {
        state: "ગુજરાત",
        temples: [
            { 
                name: "દ્વારકાધીશ મંદિર – દ્વારકા", 
                description: "Dwarkadhish Temple", 
                liveVideoId: "jEYlt46IXfs", 
                location: "Dwarka, Gujarat", 
                liveChannelUrl: "https://www.youtube.com/@shridwarkadhishmandirofficial/live",
                socialLinks: {
                    facebook: "https://www.facebook.com/shridwarkadhishmandirofficial/",
                    instagram: "https://www.instagram.com/shridwarkadhishmandirofficial/"
                },
                history: "દ્વારકાધીશ મંદિર, જેને જગત મંદિર તરીકે પણ ઓળખવામાં આવે છે, તે ભગવાન કૃષ્ણને સમર્પિત ચાલુક્ય શૈલીનું હિન્દુ મંદિર છે. 5 માળની ઇમારતનું મુખ્ય મંદિર, જે 72 સ્તંભો દ્વારા સપોર્ટેડ છે, તેને જગત મંદિર અથવા નિજા મંદિર તરીકે ઓળખવામાં આવે છે. પુરાતત્વીય તારણો સૂચવે છે કે મૂળ મંદિર કૃષ્ણના પૌત્ર વજ્રનાભ દ્વારા 2,500 વર્ષ પહેલાં હરિ-ગૃહ (ભગવાન કૃષ્ણનું નિવાસસ્થાન) પર બાંધવામાં આવ્યું હતું. તે ચાર ધામ યાત્રાધામોમાંનું એક છે.",
                history_en: "The Dwarkadhish temple, also known as the Jagat Mandir, is a Chalukya styled Hindu temple dedicated to Lord Krishna. The main shrine of the five-storied building, supported by 72 pillars, is known as Jagat Mandir or Nija Mandir. Archaeological findings suggest the original temple was built by Krishna's grandson, Vajranabha, over the Hari-Griha (Lord Krishna's residential place) 2,500 years ago. It is one of the Char Dham pilgrimage sites.",
                history_hi: "द्वारकाधीश मंदिर, जिसे जगत मंदिर भी कहा जाता है, भगवान कृष्ण को समर्पित चालुक्य शैली का हिंदू मंदिर है। 5 मंजिला इमारत का मुख्य मंदिर, जो 72 खंभों पर टिका है, जगत मंदिर या निज मंदिर कहलाता है। पुरातात्विक निष्कर्ष बताते हैं कि मूल मंदिर कृष्ण के पोते वज्रनाभ द्वारा 2,500 साल पहले हरि-गृह (भगवान कृष्ण का निवास स्थान) पर बनाया गया था। यह चार धाम तीर्थस्थलों में से एक है।"
            },
            { 
                name: "સોમનાથ મહાદેવ – સોમનાથ", 
                description: "Somnath Jyotirlinga", 
                liveVideoId: "-2yFWlIB1Zs", 
                location: "Veraval, Gujarat", 
                liveChannelUrl: "https://www.youtube.com/@SomnathTempleOfficialChannel/streams",
                socialLinks: {
                    facebook: "https://www.facebook.com/SomnathTempleOfficial/",
                    instagram: "https://www.instagram.com/somnathtempleofficial/"
                },
                keywords: ["Darshan", "Aarti", "Pooja", "Mahapooja"],
                history: "સોમનાથ ભગવાન શિવના 12 જ્યોતિર્લિંગોમાંનું પ્રથમ છે. આ મંદિર પ્રભાસ પાટણમાં આવેલું છે. દંતકથા કહે છે કે ચંદ્રદેવ (સોમ) એ સોનામાં, રાવણે ચાંદીમાં અને શ્રીકૃષ્ણે સુખડમાં આ મંદિર બનાવ્યું હતું. વર્તમાન માળખું, જે ચાલુક્ય શૈલીમાં બાંધવામાં આવ્યું છે, તે સદીઓથી આક્રમણકારો દ્વારા વારંવાર નાશ પામ્યા પછી 1951 માં સરદાર વલ્લભભાઈ પટેલ દ્વારા પુનર્નિર્મિત કરવામાં આવ્યું હતું. તે શાશ્વત શ્રદ્ધાના પ્રતીક તરીકે ઊભું છે.",
                history_en: "Somnath is the first of the 12 Jyotirlingas of Lord Shiva. The temple is located at Prabhas Patan. Legend says the Moon God (Soma) built the temple in gold, Ravana in silver, and Krishna in sandalwood. The current structure, built in the Chalukya style, was reconstructed by Sardar Vallabhbhai Patel in 1951 after repeated destructions by invaders over centuries. It stands as a symbol of eternal faith.",
                history_hi: "सोमनाथ भगवान शिव के 12 ज्योतिर्लिंगों में सबसे प्रथम है। यह मंदिर प्रभास पाटन में स्थित है। किंवदंती है कि चंद्रदेव (सोम) ने सोने में, रावण ने चांदी में और श्री कृष्ण ने चंदन की लकड़ी में इस मंदिर का निर्माण किया था। वर्तमान संरचना, जिसे चालुक्य शैली में बनाया गया है, 1951 में सरदार वल्लभभाई पटेल द्वारा आक्रमणकारियों द्वारा बार-बार नष्ट किए जाने के बाद पुनर्निर्मित की गई थी। यह शाश्वत विश्वास के प्रतीक के रूप में खड़ा है।"
            },
            { 
                name: "રણછોડરાયજી – ડાકોર", 
                description: "Ranchhodraiji Temple", 
                liveVideoId: "53JgXelmHsg", 
                location: "Dakor, Gujarat", 
                liveChannelUrl: "https://www.youtube.com/c/RanchhodraijiLiveDarshanDakor/live",
                socialLinks: {
                    facebook: "https://www.facebook.com/RanchhodraijiLiveDarshanDakor/",
                    instagram: "https://www.instagram.com/ranchhodraiji_dakor/"
                },
                history: "રણછોડરાયજીનું મુખ્ય મંદિર 1772 એ.ડી.માં શ્રી ગોપાલરાવ જગન્નાથ તાંબેકર દ્વારા બાંધવામાં આવ્યું હતું. દંતકથા છે કે બોડાણા નામનો ભક્ત, જે દર વર્ષે ડાકોરથી દ્વારકા ચાલીને જતો હતો, તે તેની વૃદ્ધાવસ્થામાં ભગવાન કૃષ્ણ (રણછોડરાયજી) ની મૂર્તિ ડાકોર લાવ્યો કારણ કે ભગવાન તેની ભક્તિથી પ્રસન્ન થયા હતા અને તેની સાથે આવવા રાજી થયા હતા.",
                history_en: "The main temple of Ranchhodraiji was built by Shri Gopalrao Jagannath Tambwekar in 1772 A.D. Legend says that a devotee named Bodana, who used to walk from Dakor to Dwarka every year, brought the idol of Lord Krishna (Ranchhodraiji) to Dakor in his old age because the Lord was pleased with his devotion and agreed to come with him.",
                history_hi: "रणछोड़रायजी का मुख्य मंदिर 1772 ई. में श्री गोपालराव जगन्नाथ तांबेकर द्वारा बनवाया गया था। किंवदंती है कि बोडाणा नामक भक्त, जो हर साल डाकोर से द्वारका पैदल जाता था, अपनी वृद्धावस्था में भगवान कृष्ण (रणछोड़रायजी) की मूर्ति को डाकोर ले आया क्योंकि भगवान उसकी भक्ति से प्रसन्न थे और उसके साथ आने के लिए सहमत हुए थे।"
            },
            { 
                name: "નાગેશ્વર મહાદેવ – દ્વારકા", 
                description: "Nageshwar Jyotirlinga", 
                liveVideoId: "PRE-RECORDED_VIDEO_ID", 
                location: "Dwarka, Gujarat",
                history: "નાગેશ્વર જ્યોતિર્લિંગ 12 જ્યોતિર્લિંગોમાંનું એક છે. શિવપુરાણમાં તેનો ઉલ્લેખ છે. રાક્ષસ દારુકાએ સુપ્રિયા નામના ભક્તને અહીં કેદ કરી હતી. ભગવાન શિવ રાક્ષસને પરાજિત કરવા અને તેમના ભક્તનું રક્ષણ કરવા માટે પ્રગટ થયા હતા. મંદિરમાં ભગવાન શિવની 25 મીટર ઊંચી વિશાળ પ્રતિમા છે.",
                history_en: "Nageshwar Jyotirlinga is one of the 12 Jyotirlingas. It is mentioned in the Shiva Purana. The demon Daruka imprisoned a devotee named Supriya here. Lord Shiva appeared to defeat the demon and protect his devotee. The temple features a giant 25-meter tall statue of Lord Shiva.",
                history_hi: "नागेश्वर ज्योतिर्लिंग 12 ज्योतिर्लिंगों में से एक है। शिव पुराण में इसका उल्लेख है। राक्षस दारुका ने सुप्रिया नामक भक्त को यहाँ कैद किया था। भगवान शिव राक्षस को हराने और अपने भक्त की रक्षा करने के लिए प्रकट हुए थे। मंदिर में भगवान शिव की 25 मीटर ऊंची विशाल प्रतिमा है।"
            },
            { 
                name: "સ્વામિનારાયણ મંદિર – વડતાલ", 
                description: "Swaminarayan Temple Vadtal", 
                liveVideoId: "PRE-RECORDED_VIDEO_ID", 
                location: "Vadtal, Gujarat", 
                liveChannelUrl: "https://www.youtube.com/user/TheSwaminarayangadi/live",
                history: "વડતાલ સ્વામિનારાયણ મંદિર એસ.જી. બ્રહ્માનંદ સ્વામીની દેખરેખ હેઠળ બનાવવામાં આવ્યું હતું. ભગવાન સ્વામિનારાયણે પોતે 1824 માં અહીં લક્ષ્મીનારાયણ દેવની મૂર્તિઓ સ્થાપિત કરી હતી. તે શ્રી લક્ષ્મીનારાયણ દેવ ગાદીનું મુખ્યડું છે.",
                history_en: "The Vadtal Swaminarayan Temple was built under the supervision of S.G. Brahmanand Swami. Lord Swaminarayan Himself installed the idols of Laxminarayan Dev here in 1824. It is the headquarters of the Shri Laxminarayan Dev Gadi.",
                history_hi: "वड़ताल स्वामीनारायण मंदिर एस.जी. ब्रह्मानन्द स्वामी की देखरेख में बनाया गया था। भगवान स्वामीनारायण ने स्वयं 1824 में यहाँ लक्ष्मीनारायण देव की मूर्तियाँ स्थापित की थीं। यह श्री लक्ष्मीनारायण देव गादी का मुख्यालय है।"
            },
            { 
                name: "સ્વામિનારાયણ મંદિર – કાલુપુર", 
                description: "Kalupur Swaminarayan Mandir", 
                liveVideoId: "PRE-RECORDED_VIDEO_ID", 
                location: "Ahmedabad, Gujarat", 
                liveChannelUrl: "https://www.youtube.com/@KalupurMandir/live",
                history: "આ સ્વામિનારાયણ સંપ્રદાયનું પ્રથમ મંદિર છે, જે 1822 માં બ્રિટિશ સરકાર દ્વારા આપવામાં આવેલી જમીન પર બનાવવામાં આવ્યું હતું. ભગવાન સ્વામિનારાયણે અહીં નરનારાયણ દેવની મૂર્તિઓ સ્થાપિત કરી હતી. તે જટિલ લાકડાની કોતરણી અને સ્થાપત્યનો શ્રેષ્ઠ નમૂનો છે.",
                history_en: "This is the first temple of the Swaminarayan Sampraday, built in 1822 on land given by the British government. Lord Swaminarayan installed the idols of NarNarayan Dev here. It is a masterpiece of intricate wood carving and architecture.",
                history_hi: "यह स्वामीनारायण संप्रदाय का पहला मंदिर है, जिसे 1822 में ब्रिटिश सरकार द्वारा दी गई भूमि पर बनाया गया था। भगवान स्वामीनारायण ने यहाँ नरनारायण देव की मूर्तियाँ स्थापित की थीं। यह जटिल लकड़ी की नक्काशी और वास्तुकला का एक उत्कृष्ट नमूना है।"
            },
            { 
                name: "ISKCON – અમદાવાદ", 
                description: "ISKCON Ahmedabad", 
                liveVideoId: "PRE-RECORDED_VIDEO_ID", 
                location: "Ahmedabad, Gujarat", 
                liveChannelUrl: "https://www.youtube.com/@ISKCONAhmedabad/live",
                history: "ઇસ્કોન અમદાવાદ, જે હરે કૃષ્ણ મંદિર તરીકે ઓળખાય છે, તે રાધા અને ગોવિંદને સમર્પિત છે. તે આધ્યાત્મિક શિક્ષણ અને વૈદિક સંસ્કૃતિનું કેન્દ્ર છે, જે ભગવદ ગીતા અને શ્રીમદ ભાગવતરામમાં પ્રસ્તુત ભગવાન કૃષ્ણના ઉપદેશોનો પ્રચાર કરે છે.",
                history_en: "ISKCON Ahmedabad, known as the Hare Krishna Temple, is dedicated to Radha and Govind. It is a center for spiritual learning and Vedic culture, promoting the teachings of Lord Krishna as presented in the Bhagavad Gita and Srimad Bhagavatam.",
                history_hi: "इस्कॉन अहमदाबाद, जिसे हरे कृष्ण मंदिर के रूप में जाना जाता है, राधा और गोविंद को समर्पित है। यह आध्यात्मिक शिक्षा और वैदिक संस्कृति का केंद्र है, जो भगवद् गीता और श्रीमद् भागवतम में प्रस्तुत भगवान कृष्ण की शिक्षाओं का प्रचार करता है।"
            },
            { 
                name: "ISKCON – રાજકોટ", 
                description: "ISKCON Rajkot", 
                liveVideoId: "PRE-RECORDED_VIDEO_ID", 
                location: "Rajkot, Gujarat",
                history: "ઇસ્કોન રાજકોટ (શ્રી શ્રી રાધા નીલમાધવ ધામ) એ રાજકોટમાં આધ્યાત્મિક ઓએસિસ તરીકે સેવા આપતું એક સુંદર મંદિર સંકુલ છે. તે જન્માષ્ટમી અને રથયાત્રા જેવા ભવ્ય તહેવારોનું આયોજન કરે છે.",
                history_en: "ISKCON Rajkot (Sri Sri Radha Neelmadhav Dham) is a beautiful temple complex serving as a spiritual oasis in Rajkot. It hosts grand festivals like Janmashtami and Ratha Yatra.",
                history_hi: "इस्कॉन राजकोट (श्री श्री राधा नीलमाधव धाम) राजकोट में एक आध्यात्मिक नखलिस्तान के रूप में सेवा करने वाला एक सुंदर मंदिर परिसर है। यह जन्माष्टमी और रथ यात्रा जैसे भव्य त्योहारों का आयोजन करता है।"
            },
            { 
                name: "ખોડિયાર મંદિર - ભાવનગર રાજપરા", 
                description: "Khodiyar Maa Rajpara", 
                liveVideoId: "DWjV3Xm565g", 
                location: "Bhavnagar, Gujarat",
                history: "આ મંદિર તાંતણીયા ધરા પાસે આવેલું છે. ખોડિયાર મા (જાનબાઈ) નો જન્મ ભગવાન શિવના આશીર્વાદથી મામડ જી ચારણના ઘરે 7 બહેનો અને 1 ભાઈમાંના એક તરીકે થયો હતો. રાજપરાનું મંદિર મહત્વનું છે કારણ કે દેવી જુનાગઢના શાસક રા'નવઘણને મદદ કરવા માટે અહીં પ્રગટ થયા હોવાનું માનવામાં આવે છે. 'મગર' તેમનું વાહન છે.",
                history_en: "This temple is situated near Tataniya Dhara. Khodiyar Maa (Janbai) was born as one of 7 sisters and 1 brother to Mamad Ji Charan with the blessings of Lord Shiva. The temple at Rajpara is significant as the Goddess is believed to have appeared here to help Ra'Navghan, the ruler of Junagadh. The 'Magar' (Crocodile) is her vehicle.",
                history_hi: "यह मंदिर तांतणिया धरा के पास स्थित है। खोड़ियार मां (जानबाई) का जन्म भगवान शिव के आशीर्वाद से मामड जी चारण के घर 7 बहनों और 1 भाई में से एक के रूप में हुआ था। राजपरा का मंदिर महत्वपूर्ण है क्योंकि माना जाता है कि देवी जूनागढ़ के शासक रा'नवघण की मदद करने के लिए यहाँ प्रकट हुई थीं। 'मगरमच्छ' उनका वाहन है।"
            }
        ]
    },
    {
        state: "મહારાષ્ટ્ર",
        temples: [
            { 
                name: "સિદ્ધિવિનાયક ગણપતિ – મુંબઈ", 
                description: "Siddhivinayak Temple", 
                liveVideoId: "PRE-RECORDED_VIDEO_ID", 
                location: "Mumbai, Maharashtra", 
                liveChannelUrl: "https://www.youtube.com/channel/UCaEtfv3IzW_1vMWo2ftboMw/live",
                history: "સિદ્ધિવિનાયક મંદિર મૂળરૂપે 1801 માં લક્ષ્મણ વિથુ અને દેઉબાઈ પાટીલ દ્વારા બનાવવામાં આવ્યું હતું. અહીં ગણેશજીની મૂર્તિની સૂંઢ જમણી બાજુ છે. તે મુંબઈના સૌથી ધનિક અને સૌથી વધુ મુલાકાત લેવાતા મંદિરોમાંનું એક માનવામાં આવે છે.",
                history_en: "The Siddhivinayak Temple was originally built in 1801 by Laxman Vithu and Deubai Patil. The idol of Ganesha here has its trunk titled to the right. It is considered one of the richest and most visited temples in Mumbai.",
                history_hi: "सिद्धिविनायक मंदिर मूल रूप से 1801 में लक्ष्मण विथु और देउबाई पाटिल द्वारा बनाया गया था। यहाँ गणेश जी की मूर्ति की सूंड दाईं ओर है। इसे मुंबई के सबसे अमीर और सबसे अधिक देखे जाने वाले मंदिरों में से एक माना जाता है।"
            },
            { 
                name: "દગડુશેઠ ગણપતિ – પુણે", 
                description: "Dagdusheth Halwai Ganpati", 
                liveVideoId: "PRE-RECORDED_VIDEO_ID", 
                location: "Pune, Maharashtra", 
                liveChannelUrl: "https://www.youtube.com/@DagdushethGanpatiOfficial/live",
                history: "પ્લેગમાં પુત્ર ગુમાવ્યા બાદ મીઠાઈ વેચનાર દગડુશેઠ હલવાઈ દ્વારા નિર્મિત. અહીંની ગણેશ પ્રતિમા ખૂબ જ પ્રખ્યાત છે અને પૂણેમાં ગણેશોત્સવ દરમિયાન મંદિર ઉજવણીનું મુખ્ય કેન્દ્ર હોય છે.",
                history_en: "Built by Dagdusheth Halwai, a sweetmeat seller, after he lost his son to plague. The Ganesh idol here is very famous and the temple is a major center of celebration during Ganeshotsav in Pune.",
                history_hi: "प्लेग में अपना बेटा खोने के बाद मिठाई विक्रेता दगडूशेठ हलवाई द्वारा निर्मित। यहाँ की गणेश प्रतिमा बहुत प्रसिद्ध है और पुणे में गणेशोत्सव के दौरान मंदिर उत्सव का मुख्य केंद्र होता है।"
            },
            { 
                name: "શિરડી સાઈ બાબા મંદિર", 
                description: "Shirdi Sai Baba", 
                liveVideoId: "4-PkAQKpMkM", 
                location: "Shirdi, Maharashtra", 
                liveChannelUrl: "https://www.youtube.com/@saibabasansthantrust/live",
                history: "શિરડી મહાન સંત સાઈ બાબાનું ઘર છે, જેઓ 50 વર્ષથી વધુ સમય સુધી અહીં રહ્યા હતા. તેમણે 'સૌનો માલિક એક'નું સાર્વત્રિક સૂત્ર શીખવ્યું હતું. સમાધિ મંદિર 1922 માં બનાવવામાં આવ્યું હતું અને તેમાં તેમના નશ્વર અવશેષો છે.",
                history_en: "Shirdi is the home of the great saint Sai Baba, who lived here for over 50 years. He taught the universal slogan 'Sabka Malik Ek'. The Samadhi Mandir was built in 1922 and houses his mortal remains.",
                history_hi: "शिरडी महान संत साईं बाबा का घर है, जो 50 वर्षों से अधिक समय तक यहाँ रहे। उन्होंने 'सबका मालिक एक' का सार्वभौमिक सूत्र सिखाया। समाधि मंदिर 1922 में बनाया गया था और इसमें उनके नश्वर अवशेष हैं।"
            },
            { 
                name: "શનિ શિંગણાપુર", 
                description: "Shani Shingnapur", 
                liveVideoId: "PRE-RECORDED_VIDEO_ID", 
                location: "Ahmednagar, Maharashtra",
                history: "આ ગામ પ્રખ્યાત છે કારણ કે કોઈ પણ ઘરને દરવાજા નથી, માત્ર દરવાજાની ફ્રેમ છે. એવું માનવામાં આવે છે કે ચોરીનો પ્રયાસ કરનારને શનિદેવ સજા કરે છે. દેવતા સ્વયંભૂ કાળા પથ્થર છે જે ખુલ્લા પ્લેટફોર્મ પર ઉભા છે.",
                history_en: "This village is famous because no house has doors, only door frames. It is believed that Lord Shani (Saturn) punishes anyone attempting theft. The deity is a self-emerged black stone (Swayambhu) that stands on an open platform.",
                history_hi: "यह गाँव इसलिए प्रसिद्ध है क्योंकि यहाँ किसी भी घर में दरवाज़े नहीं हैं, केवल दरवाज़े की चौखट हैं। ऐसा माना जाता है कि चोरी का प्रयास करने वाले को शनिदेव दंडित करते हैं। देवता स्वयंभू काला पत्थर है जो एक खुले चबूतरे पर खड़ा है।"
            },
            { 
                name: "ત્ર્યંબકેશ્વર જ્યોતિર્લિંગ – નાશિક", 
                description: "Trimbakeshwar Jyotirlinga", 
                liveVideoId: "PRE-RECORDED_VIDEO_ID", 
                location: "Nashik, Maharashtra",
                history: "ત્ર્યંબકેશ્વર 12 જ્યોતિર્લિંગોમાંનું એક છે અને ગોદાવરી નદીનું ઉદગમ સ્થાન છે. આ જ્યોતિર્લિંગની વિશિષ્ટતા તેના ત્રણ ચહેરા છે જે ભગવાન બ્રહ્મા, વિષ્ણુ અને રુદ્રનું પ્રતિક છે.",
                history_en: "Trimbakeshwar is one of the 12 Jyotirlingas and the source of the Godavari river. The unique feature of this Jyotirlinga is its three faces embodying Lord Brahma, Vishnu, and Rudra.",
                history_hi: "त्र्यंबकेश्वर 12 ज्योतिर्लिंगों में से एक है और गोदावरी नदी का उद्गम स्थल है। इस ज्योतिर्लिंग की विशेषता इसके तीन मुख हैं जो भगवान ब्रह्मा, विष्णु और रुद्र का प्रतीक हैं।"
            },
            { 
                name: "ભીમાશંકર જ્યોતિર્લિંગ", 
                description: "Bhimashankar Jyotirlinga", 
                liveVideoId: "PRE-RECORDED_VIDEO_ID", 
                location: "Pune, Maharashtra",
                history: "સહ્યાદ્રિ પર્વતમાળામાં આવેલું ભીમાશંકર બીજું એક જ્યોતિર્લિંગ છે. દંતકથા વર્ણવે છે કે કેવી રીતે ભગવાન શિવે અહીં ત્રિપુરાસુર રાક્ષસનો નાશ કર્યો હતો. તે જૈવવિવિધતાનું પણ મોટું કેન્દ્ર છે.",
                history_en: "Situated in the Sahyadri hills, Bhimashankar is another Jyotirlinga. Legend relates how Lord Shiva destroyed the demon Tripurasura here. It is also a biodiversity hotspot.",
                history_hi: "सह्याद्रि पर्वतमाला में स्थित भीमाशंकर एक और ज्योतिर्लिंग है। किंवदंती बताती है कि कैसे भगवान शिव ने यहाँ त्रिपुरासुर राक्षस का विनाश किया था। यह जैव विविधता का भी एक बड़ा केंद्र है।"
            }
        ]
    },
    {
        state: "મધ્યપ્રદેશ",
        temples: [
            { 
                name: "મહાકાળેશ્વર મંદિર – ઉજ્જૈન", 
                description: "Mahakaleshwar Jyotirlinga", 
                liveVideoId: "30Myx5zl7_I", 
                location: "Ujjain, MP", 
                liveChannelUrl: "https://www.youtube.com/@mahakaleshwarujjain/live",
                history: "મહાકાલેશ્વર એકમાત્ર સ્વયંભૂ જ્યોતિર્લિંગ છે જ્યાં મૂર્તિ દક્ષિણ મુખી (દક્ષિણામૂર્તિ) છે. અહીંની ભસ્મ આરતી, જ્યાં દેવતાને પવિત્ર રાખથી શણગારવામાં આવે છે, તે વિશ્વ પ્રસિદ્ધ છે. તે કાલ (સમય) અને મૃત્યુના નિયમો અનુસાર થાય છે.",
                history_en: "Mahakaleshwar is the only Swayambhu Jyotirlinga where the idol faces south (Dakshinamurti). The Bhasma Aarti here, where the deity is smeared with sacred ash, is world-famous. It is timed according to the Kaal (Time) and Death.",
                history_hi: "महाकालेश्वर एकमात्र स्वयंभू ज्योतिर्लिंग है जहाँ मूर्ति दक्षिणमुखी (दक्षिणामूर्ति) है। यहाँ की भस्म आरती, जहाँ देवता को पवित्र राख से सजाया जाता है, विश्व प्रसिद्ध है। यह काल (समय) और मृत्यु के नियमों के अनुसार होती है।"
            },
            { 
                name: "ઓંકારેશ્વર જ્યોતિર્લિંગ", 
                description: "Omkareshwar Jyotirlinga", 
                liveVideoId: "ApUGemfYdTc", 
                location: "Khandwa, MP",
                history: "ઓંકારેશ્વર નર્મદા નદીમાં માંધાતા નામના ટાપુ પર આવેલું છે, જેનો આકાર 'ઓમ' પ્રતીક જેવો છે. તે 12 જ્યોતિર્લિંગોમાંનું એક છે.",
                history_en: "Omkareshwar is situated on an island called Mandhata in the Narmada river, which is shaped like the symbol 'Om'. It is one of the 12 Jyotirlingas.",
                history_hi: "ओंकारेश्वर नर्मदा नदी में मांधाता नामक द्वीप पर स्थित है, जिसका आकार 'ओम' प्रतीक जैसा है। यह 12 ज्योतिर्लिंगों में से एक है।"
            }
        ]
    },
    {
        state: "ઉત્તર પ્રદેશ",
        temples: [
            { 
                name: "કાશી વિશ્વનાથ મંદિર – વારાણસી", 
                description: "Kashi Vishwanath", 
                liveVideoId: "PRE-RECORDED_VIDEO_ID", 
                location: "Varanasi, UP", 
                liveChannelUrl: "https://www.youtube.com/@ShriKashiVishwanathTempleTrust/live",
                history: "વારાણસીમાં ગંગાના કિનારે આવેલું, આ સૌથી પવિત્ર શિવ મંદિરોમાંનું એક છે. તેને અનેકવાર નાશ અને પુનર્નિર્મિત કરવામાં આવ્યું છે. વર્તમાન માળખું 1780માં અહલ્યાબાઈ હોલકરે બનાવ્યું હતું.",
                history_en: "Located on the banks of the Ganges in Varanasi, this is one of the holiest Shiva temples. It has been destroyed and rebuilt multiple times. The current structure was built by Ahilyabai Holkar in 1780.",
                history_hi: "वाराणसी में गंगा के तट पर स्थित, यह सबसे पवित्र शिव मंदिरों में से एक है। इसे कई बार नष्ट और पुनर्निर्मित किया गया है। वर्तमान संरचना 1780 में अहिल्याबाई होल्कर द्वारा बनाई गई थी।"
            },
            { 
                name: "વૃંદાવન ISKCON મંદિર", 
                description: "ISKCON Vrindavan", 
                liveVideoId: "PRE-RECORDED_VIDEO_ID", 
                location: "Vrindavan, UP", 
                liveChannelUrl: "https://www.youtube.com/@iskconvrindavan/live",
                history: "કૃષ્ણ બલરામ મંદિર તરીકે પણ ઓળખાય છે, તે ભારતના મુખ્ય ઇસ્કોન મંદિરોમાંનું એક છે, જે 1975 માં ખોલવામાં આવ્યું હતું. સ્વામી પ્રભુપાદે વ્યક્તિગત રીતે તેના નિર્માણની દેખરેખ રાખી હતી.",
                history_en: "Also known as the Krishna Balaram Mandir, it is one of the major ISKCON temples in India, opened in 1975. Swami Prabhupada personally oversaw its construction.",
                history_hi: "कृष्ण बलराम मंदिर के रूप में भी जाना जाता है, यह भारत के प्रमुख इस्कॉन मंदिरों में से एक है, जिसे 1975 में खोला गया था। स्वामी प्रभुपाद ने व्यक्तिगत रूप से इसके निर्माण की देखरेख की थी।"
            },
            { 
                name: "બાંકે બિહારી", 
                description: "Banke Bihari", 
                liveVideoId: "PRE-RECORDED_VIDEO_ID", 
                location: "Vrindavan, UP",
                history: "ભગવાન કૃષ્ણને સમર્પિત, અહીંની મૂર્તિ ત્રિભંગ મુદ્રામાં ઊભી છે. તેની સ્થાપના સ્વામી હરિદાસે કરી હતી. ભક્તોને ભગવાનની તીવ્ર આંખોથી અભિભૂત થતા અટકાવવા માટે દેવતાની સામેનો પડદો વારંવાર બંધ અને ખોલવામાં આવે છે.",
                history_en: "Dedicated to Lord Krishna, the idol here stands in the Tribhanga posture. It was established by Swami Haridas. The curtain before the deity is frequently closed and opened to prevent devotees from being overwhelmed by the intense eyes of the Lord.",
                history_hi: "भगवान कृष्ण को समर्पित, यहाँ की मूर्ति त्रिभंग मुद्रा में खड़ी है। इसकी स्थापना स्वामी हरिदास ने की थी। भक्तों को भगवान की तीव्र आँखों से अभिभूत होने से रोकने के लिए देवता के सामने का पर्दा बार-बार बंद और खोला जाता है।"
            }
        ]
    },
    {
        state: "આંધ્ર પ્રદેશ",
        temples: [
            { 
                name: "તિરુપતિ બાલાજી મંદિર – તિરુમલા", 
                description: "Tirumala Venkateswara", 
                liveVideoId: "PRE-RECORDED_VIDEO_ID", 
                location: "Tirumala, AP",
                history: "વિષ્ણુના અવતાર ભગવાન વેંકટેશ્વરને સમર્પિત એક સીમાચિહ્નરૂપ વૈષ્ણવ મંદિર. દાનની દ્રષ્ટિએ તે વિશ્વનું સૌથી ધનિક મંદિર છે. ઈતિહાસ પલ્લવ વંશ (9મી સદી) અને વિજયનગર સામ્રાજ્યનો છે.",
                history_en: "A landmark Vaishnavite temple dedicated to Lord Venkateswara, an avatar of Vishnu. It is the richest temple in the world in terms of donations. History dates back to the Pallava dynasty (9th century) and Vijayanagara Empire.",
                history_hi: "विष्णु के अवतार भगवान वेंकटेश्वर को समर्पित एक ऐतिहासिक वैष्णव मंदिर। दान के मामले में यह दुनिया का सबसे अमीर मंदिर है। इतिहास पल्लव वंश (9वीं शताब्दी) और विजयनगर साम्राज्य का है।"
            },
            { 
                name: "શ્રી કાલહસ્તી મંદિર", 
                description: "Srikalahasti Temple", 
                liveVideoId: "PRE-RECORDED_VIDEO_ID", 
                location: "Srikalahasti, AP",
                history: "તેના વાયુ લિંગ માટે પ્રખ્યાત છે, જે પંચ ભૂત સ્થળોમાંનું એક છે. દંતકથામાં સ્પાઈડર (શ્રી), સાપ (કાલા) અને હાથી (હસ્તી) નો સમાવેશ થાય છે જેમણે શિવની પૂજા કરી અને અહીં મોક્ષ પ્રાપ્ત કર્યો.",
                history_en: "Famous for its Vayu (Air) Linga, one of the Pancha Bhoota Sthalams. The legend involves a Spider (Sri), Snake (Kala), and Elephant (Hasti) who worshipped Shiva and attained modification here.",
                history_hi: "अपने वायु लिंग के लिए प्रसिद्ध, जो पंच भूत स्थलों में से एक है। किंवदंती में मकड़ी (श्री), सर्प (काला) और हाथी (हस्ती) शामिल हैं जिन्होंने शिव की पूजा की और यहाँ मोक्ष प्राप्त किया।"
            }
        ]
    },
    {
        state: "ઓડિશા",
        temples: [
            { 
                name: "જગન્નાથ મંદિર – પુરી", 
                description: "Jagannath Temple", 
                liveVideoId: "PRE-RECORDED_VIDEO_ID", 
                location: "Puri, Odisha", 
                liveChannelUrl: "https://www.youtube.com/@JagannathTemplePuriOfficial/live",
                history: "વાર્ષિક રથયાત્રા માટે પ્રખ્યાત. આ મંદિર ભગવાન જગન્નાથ (કૃષ્ણ), બલભદ્ર અને સુભદ્રાને સમર્પિત છે. નવકલેબરા નામની વિધિમાં લાકડાની મૂર્તિઓ દર 12 કે 19 વર્ષે બદલવામાં આવે છે. તે ચાર ધામોમાંનું એક છે.",
                history_en: "Famous for the annual Ratha Yatra. This temple is dedicated to Lord Jagannath (Krishna), Balabhadra, and Subhadra. The wooden idols are replaced every 12 or 19 years in a ritual called Nabakalebara. It is one of the Char Dhams.",
                history_hi: "वार्षिक रथ यात्रा के लिए प्रसिद्ध। यह मंदिर भगवान जगन्नाथ (कृष्ण), बलभद्र और सुभद्रा को समर्पित है। नवकलेवर नामक अनुष्ठान में लकड़ी की मूर्तियाँ हर 12 या 19 साल में बदली जाती हैं। यह चार धामों में से एक है।"
            }
        ]
    },
    {
        state: "રાજસ્થાન",
        temples: [
            { 
                name: "શ્રીનાથજી મંદિર – નાથદ્વારા", 
                description: "Shrinathji Temple", 
                liveVideoId: "PRE-RECORDED_VIDEO_ID", 
                location: "Nathdwara, Rajasthan", 
                liveChannelUrl: "https://www.youtube.com/@ShrinathjiTempleNathdwara/live",
                history: "આ મંદિરમાં ગોવર્ધન પર્વતને ઉંચકતા 7 વર્ષના કૃષ્ણની મૂર્તિ છે. મુઘલ બાદશાહ ઔરંગઝેબથી બચાવવા માટે 17મી સદીમાં આ મૂર્તિ મથુરા નજીક ગોવર્ધનથી અહીં લાવવામાં આવી હતી.",
                history_en: "The temple houses the idol of 7-year-old Krishna lifting Govardhan Hill. The idol was brought here from Govardhan near Mathura in the 17th century to protect it from Mughal Emperor Aurangzeb.",
                history_hi: "इस मंदिर में गोवर्धन पर्वत को उठाते हुए 7 साल के कृष्ण की मूर्ति है। मुगल बादशाह औरंगजेब से बचाने के लिए 17वीं शताब्दी में इस मूर्ति को मथुरा के पास गोवर्धन से यहाँ लाया गया था।"
            },
            { 
                name: "સાલાસર બાલાજી", 
                description: "Salasar Balaji", 
                liveVideoId: "PRE-RECORDED_VIDEO_ID", 
                location: "Salasar, Rajasthan",
                history: "ભગવાન હનુમાનને સમર્પિત. તે અનોખું છે કારણ કે અહીં હનુમાનજીની ગોળ ચહેરા અને દાઢી/મૂછ સાથે પૂજા કરવામાં આવે છે. તેની સ્થાપના 1754માં એક ખેડૂત ભક્ત દ્વારા કરવામાં આવી હતી.",
                history_en: "Dedicated to Lord Hanuman. It is unique because Hanuman is worshipped here with a round face and beard/moustache. It was founded in 1754 by a farmer devotee.",
                history_hi: "भगवान हनुमान को समर्पित। यह अद्वितीय है क्योंकि यहाँ हनुमान जी की गोल चेहरे और दाढ़ी/मूँछ के साथ पूजा की जाती है। इसकी स्थापना 1754 में एक किसान भक्त द्वारा की गई थी।"
            }
        ]
    },
    {
        state: "તમિલનાડુ",
        temples: [
            { 
                name: "મીનાક્ષી અમ્મન મંદિર – મદુરાઈ", 
                description: "Meenakshi Temple", 
                liveVideoId: "PRE-RECORDED_VIDEO_ID", 
                location: "Madurai, TN",
                history: "વૈગાઈ નદીના દક્ષિણ કિનારે આવેલું એક ઐતિહાસિક હિન્દુ મંદિર. તે મીનાક્ષી (પાર્વતી) અને તેમના પતિક સુંદરેશ્વર (શિવ) ને સમર્પિત છે. મંદિર સંકુલમાં 14 સ્મારક ગોપુરમ (ગેટવે ટાવર) નો સમાવેશ થાય છે અને તે દ્રવિડિયન સ્થાપત્યની અદભૂત કૃતિ છે.",
                history_en: "A historic Hindu temple located on the southern bank of the Vaigai River. It is dedicated to Meenakshi (Parvati) and her consort Sundareshwar (Shiva). The temple complex includes 14 monumental gopurams (gateway towers) and is a masterpiece of Dravidian architecture.",
                history_hi: "वैगई नदी के दक्षिणी तट पर स्थित एक ऐतिहासिक हिंदू मंदिर। यह मीनाक्षी (पार्वती) और उनके पति सुंदरेश्वर (शिव) को समर्पित है। मंदिर परिसर में 14 स्मारक गोपुरम (प्रवेश द्वार मीनारें) शामिल हैं और यह द्रविड़ वास्तुकला की एक उत्कृष्ट कृति है।"
            },
            { 
                name: "રમેશ્વરમ મંદિર", 
                description: "Ramanathaswamy Temple", 
                liveVideoId: "PRE-RECORDED_VIDEO_ID", 
                location: "Rameswaram, TN",
                history: "રામનાથસ્વામી મંદિર 12 જ્યોતિર્લિંગોમાંનું એક છે. દંતકથા કહે છે કે ભગવાન રામે રાવણને મારવાના પાપમાંથી મુક્તિ મેળવવા માટે અહીં ભગવાન શિવની પૂજા કરી હતી. આ મંદિરમાં ભારતના તમામ હિન્દુ મંદિરોમાં સૌથી લાંબો કોરિડોર છે.",
                history_en: "Ramanathaswamy Temple is one of the 12 Jyotirlingas. Legend says Lord Rama worshipped Lord Shiva here to absolve the sins of killing Ravana. The temple has the longest corridor among all Hindu temples in India.",
                history_hi: "रामनाथस्वामी मंदिर 12 ज्योतिर्लिंगों में से एक है। किंवदंती है कि भगवान राम ने रावण को मारने के पाप से मुक्ति पाने के लिए यहाँ भगवान शिव की पूजा की थी। इस मंदिर में भारत के सभी हिंदू मंदिरों में सबसे लंबा गलियारा है।"
            }
        ]
    },
    {
        state: "કેરળ",
        temples: [
            { 
                name: "ગુરુવાયુર શ્રી કૃષ્ણ મંદિર", 
                description: "Guruvayur Temple", 
                liveVideoId: "PRE-RECORDED_VIDEO_ID", 
                location: "Guruvayur, Kerala",
                history: "ઘણીવાર 'દક્ષિણની દ્વારકા' કહેવાય છે. ગુરુવાયુરપ્પન (કૃષ્ણ) ની મૂર્તિ વિશે કહેવાય છે કે ભગવાન બ્રહ્મા અને પાછળથી કૃષ્ણના માતાપિતા, વાસુદેવ અને દેવકી દ્વારા તેની પૂજા કરવામાં આવી હતી. તેની સ્થાપના અહીં ગુરુ (બૃહસ્પતિ) અને વાયુ (પવન દેવ) દ્વારા કરવામાં આવી હતી.",
                history_en: "Often called 'Dwarka of the South'. The idol of Guruvayurappan (Krishna) is said to have been worshipped by Lord Brahma and later by Krishna's parents, Vasudeva and Devaki. It was installed here by Guru (Brihaspati) and Vayu (Wind God).",
                history_hi: "अक्सर 'दक्षिण की द्वारका' कहा जाता है। गुरुवायुरप्पन (कृष्ण) की मूर्ति के बारे में कहा जाता है कि भगवान ब्रह्मा और बाद में कृष्ण के माता-पिता, वासुदेव और देवकी द्वारा इसकी पूजा की गई थी। इसकी स्थापना यहाँ गुरु (बृहस्पति) और वायु (पवन देव) द्वारा की गई थी।"
            }
        ]
    },
    {
        state: "જમ્મુ & કાશ્મીર",
        temples: [
            { 
                name: "વૈષ્ણો દેવી મંદિર – કટરા", 
                description: "Vaishno Devi", 
                liveVideoId: "PRE-RECORDED_VIDEO_ID", 
                location: "Katra, J&K", 
                liveChannelUrl: "https://www.youtube.com/@Official.SMVDSB/live",
                history: "ત્રિકુટા પર્વતોમાં આવેલું છે. દેવી વૈષ્ણો દેવી (મહાલક્ષ્મી, મહાકાલી અને મહાસરસ્વતીનું સ્વરૂપ) અહીં પિંડી તરીકે ઓળખાતી ત્રણ કુદરતી ખડકોના રૂપમાં બિરાજમાન છે. તે તેના ભક્તોને શક્તિ અને પરિપૂર્ણતા પ્રદાન કરે છે.",
                history_en: "Located in the Trikuta Mountains. Goddess Vaishno Devi (a manifestation of Mahalakshmi, Mahakali, and Mahasaraswati) resides here in the form of three natural rocks known as Pindies. She bestows strength and fulfillment to her devotees.",
                history_hi: "त्रिकुटा पर्वतों में स्थित है। देवी वैष्णो देवी (महालक्ष्मी, महाकाली और महासरस्वती का स्वरूप) यहाँ पिंडी के रूप में जानी जाने वाली तीन प्राकृतिक चट्टानों के रूप में विराजमान हैं। वह अपने भक्तों को शक्ति और परिपूर्णता प्रदान करती हैं।"
            }
        ]
    },
    {
        state: "આસામ / પૂર્વ ભારત",
        temples: [
            { 
                name: "કામાખ્યા દેવી મંદિર – આસામ", 
                description: "Kamakhya Temple", 
                liveVideoId: "PRE-RECORDED_VIDEO_ID", 
                location: "Guwahati, Assam",
                history: "51 શક્તિપીઠોમાં સૌથી જૂનું અને સૌથી આદરણીય. તે સતીની યોનિ (ગર્ભ) નું પ્રતિનિધિત્વ કરે છે. આ મંદિર અંબુબાચી મેળા માટે પ્રખ્યાત છે, જે દરમિયાન દેવી તેમના વાર્ષિક માસિક ધર્મમાંથી પસાર થતી હોવાનું માનવામાં આવે છે.",
                history_en: "Oldest and most revered of the 51 Shakti Peethas. It represents the yoni (womb) of Sati. The temple is famous for the Ambubachi Mela, during which the Goddess is believed to undergo her annual menstruation.",
                history_hi: "51 शक्तिपीठों में सबसे पुराना और सबसे प्रतिष्ठित। यह सती की योनि (गर्भ) का प्रतिनिधित्व करता है। यह मंदिर अंबुबाची मेले के लिए प्रसिद्ध है, जिसके दौरान देवी के बारे में माना जाता है कि वह अपने वार्षिक मासिक धर्म से गुजरती हैं।"
            },
            { 
                name: "કાલી ઘાટ મંદિર – કોલકાતા", 
                description: "Kalighat Temple", 
                liveVideoId: "PRE-RECORDED_VIDEO_ID", 
                location: "Kolkata, WB",
                history: "એક મુખ્ય શક્તિપીઠ જ્યાં સતીના જમણા પગનો અંગૂઠો પડ્યો હતો. આ મંદિર દેવી કાલીને સમર્પિત છે અને 200 વર્ષ જૂનું છે, જોકે આ સ્થળ લાંબા સમયથી પવિત્ર છે.",
                history_en: "A major Shakti Peetha where the toe of the right foot of Sati fell. This temple is dedicated to Goddess Kali and is 200 years old, although the site has been sacred for much longer.",
                history_hi: "एक प्रमुख शक्तिपीठ जहाँ सती के दाहिने पैर का अंगूठा गिरा था। यह मंदिर देवी काली को समर्पित है और 200 साल पुराना है, हालाँकि यह स्थल लंबे समय से पवित्र है।"
            }
        ]
    },
    {
        state: "પશ્ચિમ બંગાળ",
        temples: [
            { 
                name: "ISKCON માયાપુર", 
                description: "ISKCON Mayapur", 
                liveVideoId: "PRE-RECORDED_VIDEO_ID", 
                location: "Mayapur, WB", 
                liveChannelUrl: "https://www.youtube.com/@IskconMayapur/live",
                history: "માયાપુર 1486 માં ચૈતન્ય મહાપ્રભુ (કૃષ્ણનો અવતાર) નું જન્મસ્થળ છે. તે ઇસ્કોનનું મુખ્ય મથક છે. અહીં નિર્માણાધીન વૈદિક તારામંડળનું મંદિર વિશ્વના સૌથી મોટા મંદિરોમાંનું એક બનવા જઈ રહ્યું છે.",
                history_en: "Mayapur is the birthplace of Chaitanya Mahaprabhu (an incarnation of Krishna) in 1486. It is the headquarters of ISKCON. The Temple of the Vedic Planetarium under construction here is set to becomes one of the world's largest temples.",
                history_hi: "मायापुर 1486 में चैतन्य महाप्रभु (कृष्ण का अवतार) का जन्मस्थान है। यह इस्कॉन का मुख्यालय है। यहाँ निर्माणाधीन वैदिक तारामंडल का मंदिर दुनिया के सबसे बड़े मंदिरों में से एक बनने जा रहा है।"
            }
        ]
    }
];

const https = require('https');

// --- YouTube Live Check Logic ---

// On-demand check function
function checkYouTubeLive(channelUrl, callback, keywords = [], ignoreIds = []) {
    if (!channelUrl) {
        callback("PRE-RECORDED_VIDEO_ID");
        return;
    }

    console.log(`[${new Date().toLocaleTimeString()}] Checking Live: ${channelUrl} ${keywords.length ? '(Keywords: ' + keywords.join(',') + ')' : ''}`);
    
    const options = {
        headers: {
             'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    };

    https.get(channelUrl, options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            let videoId = "PRE-RECORDED_VIDEO_ID";
            let detectedTitle = "";

            // Strategy A: '/streams' List Page (Advanced Filtering)
            if (channelUrl.includes('/streams')) {
                // Regex to find videoRenderer blocks and extract ID, Title, and Live Status
                // Matches: videoId":"..." ... title":{..."text":"..."} ... style":"LIVE" (roughly)
                // We scan the whole file for "videoRenderer".
                const renderers = data.split('videoRenderer');
                
                for (let i = 1; i < renderers.length; i++) {
                    const block = renderers[i];
                    
                    // Check if this block is LIVE
                    const isLive = block.includes('style="LIVE"') || 
                                   block.includes('"label":"LIVE"') ||
                                   block.includes('"text":"LIVE"'); // overlay text

                    if (isLive) {
                        const idMatch = block.match(/"videoId":"([^"]+)"/);
                        const titleMatch = block.match(/"title":\{"runs":\[\{"text":"(.*?)"\}\]/) || 
                                           block.match(/"title":\{"simpleText":"(.*?)"\}/);
                        
                        if (idMatch) {
                            const id = idMatch[1];
                            const title = titleMatch ? titleMatch[1] : "Unknown Title";
                            
                            // Check blacklist
                            if (ignoreIds.includes(id)) {
                                console.log(`   ⛔ Ignored Blacklisted ID: ${id}`);
                                continue;
                            }

                            console.log(`   Found LIVE Stream: ${id} | Title: ${title}`);

                            // If keywords provided, filter
                            if (keywords.length > 0) {
                                // loose match
                                const match = keywords.some(k => title.toLowerCase().includes(k.toLowerCase()));
                                if (match) {
                                    console.log(`   ✅ Keyword Match! Selected: ${id}`);
                                    videoId = id;
                                    break; // Stop at first valid match
                                } else {
                                    console.log(`   ❌ Skipped (Keyword mismatch)`);
                                }
                            } else {
                                // No keywords, take the first live one
                                videoId = id;
                                break;
                            }
                        }
                    }
                }

            } else {
                // Strategy B: '/live' Direct Page (Default)
                const isLive = data.includes('isLive":true') || 
                               data.includes('"status":"LIVE"') ||
                               data.includes('"PLAYER_LIVE_LABEL":"Live"') ||
                               data.includes('style="LIVE"');

                // Try to find ID
                const videoIdMatch = data.match(/"videoId":"([^"]+)"/);
                const canonicalMatch = data.match(/link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([^"]+)"/);

                let id = null;
                if (videoIdMatch) id = videoIdMatch[1];
                else if (canonicalMatch) id = canonicalMatch[1];

                // Check blacklist for Strategy B too
                if (id && ignoreIds.includes(id)) {
                     console.log(`   ⛔ Ignored Blacklisted ID (Strategy B): ${id}`);
                     id = null; // Reset
                }

                if (isLive && id) videoId = id;
                else if (!isLive) videoId = "PRE-RECORDED_VIDEO_ID";
            }
            
            if (videoId !== "PRE-RECORDED_VIDEO_ID") {
                console.log(`   -> Result: ${videoId}`);
                callback(videoId);
            } else {
                console.log(`   -> Result: Offline / No Match`);
                callback("PRE-RECORDED_VIDEO_ID");
            }
        });
    }).on('error', (err) => {
        console.error(`[ERROR] Live check failed: ${err.message}`);
        callback("PRE-RECORDED_VIDEO_ID");
    });
}

// Generic Live Check Endpoint
app.get('/api/live-check', (req, res) => {
    const { channelUrl, keywords } = req.query;
    const keywordArray = keywords ? keywords.split(',') : [];
    checkYouTubeLive(channelUrl, (videoId) => {
        res.json({ videoId });
    }, keywordArray);
});

// --- Automatic Periodic Updates ---
function updateAllLiveStatuses() {
    console.log(`[${new Date().toLocaleTimeString()}] 🔄 Running Automatic Live Check for all temples...`);
    
    TEMPLE_DATA.forEach(group => {
        group.temples.forEach(temple => {
            if (temple.liveChannelUrl) {
                checkYouTubeLive(temple.liveChannelUrl, (videoId) => {
                    // Update the in-memory data
                    const isLive = videoId && videoId !== "PRE-RECORDED_VIDEO_ID";
                    
                    if (isLive) {
                        if (temple.liveVideoId !== videoId) {
                            console.log(`✅ LIVE UPDATE for ${temple.name}: ${videoId}`);
                            temple.liveVideoId = videoId;
                        }
                    } else {
                        // Keep manual default if offline? Or set to offline?
                        // For Somnath, we want strict adherence to real live vs offline
                        if (temple.liveVideoId !== "PRE-RECORDED_VIDEO_ID") {
                             // Only reset if it was previously auto-detected live. 
                             // If it was manual hardcode, maybe keep it? 
                             // But here we want automation.
                             // Let's reset to ensure we don't show stale streams.
                             temple.liveVideoId = "PRE-RECORDED_VIDEO_ID";
                        }
                    }
                }, temple.keywords || [], temple.ignoreVideoIds || []);
            }
        });
    });
}

// Run immediately on server start
setTimeout(updateAllLiveStatuses, 5000); // 5 sec delay to allow startup

// Run every 10 minutes
setInterval(updateAllLiveStatuses, 10 * 60 * 1000);

app.get('/api/temples', (req, res) => {
    res.json(TEMPLE_DATA);
});

// Backward compatibility (optional, but good if app is still hitting it)
app.get('/api/darshan', (req, res) => {
    // Return Somnath by default for the old endpoint
    res.json(TEMPLE_DATA[0].temples[1]); 
});

app.listen(port, '0.0.0.0', () => {
    console.log(`\n--- Somnath Aarti Server ---`);
    console.log(`Local:   http://localhost:${port}`);
    
    // Log Network IP
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                console.log(`Network: http://${net.address}:${port}`);
            }
        }
    }
    console.log(`Test API: http://localhost:${port}/api/darshan\n`);
});
