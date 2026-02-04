const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false
});

const Temple = sequelize.define('Temple', {
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    state: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    liveVideoId: DataTypes.STRING,
    location: DataTypes.STRING,
    history: DataTypes.TEXT,
    history_en: DataTypes.TEXT,
    history_hi: DataTypes.TEXT,
    architecture: DataTypes.TEXT,
    significance: DataTypes.TEXT,
    bestTimeToVisit: DataTypes.STRING,
    howToReach: DataTypes.TEXT,
    nearbyAttractions: DataTypes.TEXT
});

async function updateData() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB.');

        // Update Dwarka
        await Temple.update({
            history: "દ્વારકાધીશ મંદિર, જેને જગત મંદિર તરીકે પણ ઓળખવામાં આવે છે, તે ભગવાન કૃષ્ણને સમર્પિત છે. આ મંદિર અંદાજે ૨૫૦૦ વર્ષ જૂનું હોવાનું મનાય છે. આદિ શંકરાચાર્ય દ્વારા સ્થાપિત ચાર ધામોમાંનું આ એક છે.",
            architecture: "ચાલુક્ય (હિન્દુ) શૈલીમાં ૫ માળનું સુંદર બાંધકામ જે ૭૨ સ્તંભો પર ટકેલું છે. આ મંદિરના શિખર પર ૫૨ ગજની ધજા લહેરાય છે જે માઇલો દૂરથી જોઈ શકાય છે.",
            significance: "જગતગુરુ શંકરાચાર્ય દ્વારા સ્થાપિત શારદા પીઠ અને ભગવાન કૃષ્ણની પવિત્ર કર્મભૂમિ. તે મોક્ષદાયી સપ્તપુરીઓમાંની એક ગણાય છે.",
            bestTimeToVisit: "ઓક્ટોબર થી માર્ચ અને જન્માષ્ટમીનો સમય (જન્માષ્ટમીએ અહીં ભવ્ય ઉજવણી થાય છે).",
            howToReach: "દ્વારકા રેલ્વે સ્ટેશન મુખ્ય શહેરથી ૨ કિ.મી. છે. જામનગર એરપોર્ટ નજીક છે (૧૪૫ કિ.મી.).",
            nearbyAttractions: "નાગેશ્વર જ્યોતિર્લિંગ, બેટ દ્વારકા (હોડી દ્વારા), રુકમિણી મંદિર અને બ્લુ ફ્લેગ સર્ટિફાઈડ શિવરાજપુર બીચ."
        }, { where: { name: 'દ્વારકાધીશ મંદિર – દ્વારકા' } });

        // Update Somnath
        await Temple.update({
            history: "સોમનાથ ભગવાન શિવના ૧૨ જ્યોતિર્લિંગોમાંનું પ્રથમ છે. આ મંદિરનો ઇતિહાસ શ્રદ્ધા અને પુનરુત્થાનનો લડાયક ઇતિહાસ છે. તે અનેક વખત નાશ પામવા છતાં ફરીથી બેઠું થયું છે, જે ભારતની અવિનાશી ભક્તિનું પ્રતીક છે.",
            architecture: "ચાલુક્ય શૈલી (સૌરાષ્ટ્ર શૈલી) માં નિર્મિત ભવ્ય સ્થાપત્ય. સમુદ્ર કિનારે આવેલું આ મંદિર તેના પથ્થર કામ અને સુંદર કોતરણી માટે જાણીતું છે.",
            significance: "ભારતના ૧૨ જ્યોતિર્લિંગોમાં સૌથી પ્રથમ અને અત્યંત પવિત્ર સ્થાન. અહીં ત્રિવેણી સંગમ (સરસ્વતી, હિરણ અને કપિલા નદી) પણ આવેલો છે.",
            bestTimeToVisit: "પવિત્ર શ્રાવણ માસ, શિવરાત્રી અને કાર્તિકી પૂર્ણિમાના મેળા દરમિયાન.",
            howToReach: "વેરાવળ રેલ્વે સ્ટેશન માત્ર ૭ કિ.મી. દૂર છે. દીવ એરપોર્ટ થી ૮૫ કિ.મી. ના અંતરે છે.",
            nearbyAttractions: "ભાલકા તીર્થ (જ્યાં ભગવાન કૃષ્ણએ દેહત્યાગ કર્યો), ત્રિવેણી સંગમ, ગીતા મંદિર અને પૌરાણિક ગુફાઓ."
        }, { where: { name: 'સોમનાથ મહાદેવ – સોમનાથ' } });

        console.log('Update Success!');
        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
}

updateData();
