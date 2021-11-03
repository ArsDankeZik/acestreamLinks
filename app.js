require('dotenv').config();
const tmi = require('tmi.js');
const iconv = require('iconv-lite');
const proc = require('child_process');
const ct = require('countries-and-timezones');
const moment = require('moment');
const path = require("path");
const sound = require("sound-play");
const SUBS = true; // CONSTANTE GLOBAL PARA HABILITAR CIERTOS COMANDOS SOLO PARA SUBS/VIPS/MODS
const VOL = 0.2; // Controla el volumen de los sonidos !sonido
const VERSION = 1.2.0;

const client = new tmi.Client({
    options: { debug: true, messagesLogLevel: 'info'},
    connection: {
        reconnect: true,
        secure: true
    },
    identity: {
        username: `${process.env.TWITCH_USERNAME}`,
        password: `oauth:${process.env.TWITCH_OAUTH}`
    },
    channels: [`${process.env.TWITCH_CHANNEL}`]
});



client.connect().catch(console.error);

client.on('message', (channel, tags, message, self) => {
    if(self) return;
    if(tags.username.toLowerCase() === 'streamelements') return;
    // console.log(tags);

    if(message.toLocaleLowerCase().includes('!tts') && !message.toLocaleLowerCase().includes('!ttsinsulto')){
        msg = message.replace('!tts', '');
        onlySubsAllowed(tags) ? 
            talkToMe(`${tags.username} dice ${msg}`) : 
            client.say(channel, `@${tags.username} no tienes permitido realizar esta acción`);
    }

    if(message.toLocaleLowerCase().includes('!ttsinsulto')){
        msg = message.replace('!ttsinsulto', '');
        onlySubsAllowed(tags) ? 
            talkToMe(`${tags.username} dice ${pickRandom(insultos)}`) : 
            client.say(channel, `@${tags.username} no tienes permitido realizar esta acción`);
    }

    if(message.toLocaleLowerCase().includes('!sonido')){
        msg = message.replace('!sonido', '').trim();
        onlySubsAllowed(tags) ? 
            playSound(`${msg}`) : 
            client.say(channel, `@${tags.username} no tienes permitido realizar esta acción`);
    }

    if(message.toLocaleLowerCase().includes('!hora')){
        msg = message.replace('!hora', '').trim();
        console.log(msg);
        client.say(channel, `${calculateHour(msg.toUpperCase())}`);
    }
    
    switch(message.toLowerCase()){
        case '!insulto': 
            client.say(channel, `${pickRandom(insultos)}`);
            break;
        case '!log':
            if(tags.badge.hasOwnProperty('moderator') || tags.badges.hasOwnProperty('broadcaster')) console.log(tags);
            break;
        case '!rango':
            client.say(channel, `${tags.username} ${dimeMiRango(tags.badges)}`);
            break;
        case '!piropo':
            client.say(channel, `${pickRandom(piropos)}`);
            break;
        case 'hola':
            client.say(channel, `Hola, ${tags.username}`);
            break;
        case '!dado':
            client.say(channel, `Has sacado un, ${dado()}`);
            break;
        case '!creador':
            client.say(channel, 'El nombre de mi creador es @noctismaiestatem (twitch.tv/noctismaiestatem)');
            break;
        case '!help':
            client.say(channel, 
                `
                !insulto: te devolverá un insulto rándom || 
                !piropo: leerá por voz un mensaje aleatorio || 
                !rango: te dirá qué tipo de miembro eres en la comunidad || 
                !creador: devolverá el nombre del creador del bot || 
                !dado: tirará un dado por ti ||
                !hora [ES, RO, RU, AR, CO]: devuelve la hora en estos países y sus diferentes zonas
                `);
            client.say(channel, 
                `
                !sonido [bofeton, gemido, pedo, pedomojado, sorpresa, aplausos, gota, aplausos niños, suspense]: reproduce uno de los sonidos de la lista (mod, vip, sub)||
                !tts: leerá tu mensaje por voz [beta] (mod, vip, sub) || 
                !ttsinsulto: leerá por voz un mensaje aleatorio (mod, vip, sub) 
                `);
            break;
    };
});

client.on('resub', (channel, username, months, message, userstate, methos) => {
    client.say(channel, `¡El cabronazo de ${username} lleva ya ${months} meses suscrito!`);
});

// addOrSubMinutes(-120)
// addOrSubMinutes(120)
function addOrSubMinutes(min){
    return moment().add(min, 'minutes').toDate();
}

function calculateHour(tzone){    
    let minutesToAdd = [];
    let names = [];
    let country = ct.getCountry(tzone); //RO, ES 

    country.timezones.forEach(timezone => {
        minutesToAdd.push((ct.getTimezone(timezone)).utcOffset);
        names.push((ct.getTimezone(timezone)).name);
    });

    let finalHours = [];
    minutesToAdd.forEach(zone => finalHours.push(moment(addOrSubMinutes(zone)).utc().format('HH:hh')));
    let str = '';
    finalHours.forEach((f, i) => {
        if(i == 0) str+=`${names[i].split('/').pop().replace('_', ' ')} - ${f}`;
        else str+=`, ${names[i].split('/').pop().replace('_', ' ')} - ${f}`;
    });
    return str;
}
// console.log(calculateHour('RU'));

function encodeRust(text){
    text = text.toLowerCase();
    text = text.replace('á', 'a');
    text = text.replace('í', 'i');
    text = text.replace('ó', 'o');
    text = text.replace('é', 'e');
    text = text.replace('ú', 'u');
    text = text.replace('ç', 'shh');
    text = text.replace('eé', 'ee');
    text = text.replace('üi', 'wi');
    text = text.replace('üe', 'we');
    text = text.replace('ñ', 'ny');
    text = text.replace('ll', 'ya');

    return text;
}

function talkToMe(text){
    if(process.platform != 'win32'){
        console.log('No funcionará en otra plataforma que no sea Windows');
        return;
    }
    if(text == undefined || text.length == 0) return;
    let commands = [ 'Add-Type -AssemblyName System.speech; $speak = New-Object System.Speech.Synthesis.SpeechSynthesizer; $speak.Rate = 1.2; $speak.Speak([Console]::In.ReadToEnd())' ];
    let options = { shell: true };
    let childD = proc.spawn('powershell', commands, options);
    text = encodeRust(text);
    childD.stdin.end(iconv.encode(text, 'UTF-8'));
}

function onlySubsAllowed(tags){
    if(!SUBS) return true;

    if(tags.badges != null && tags.badges != undefined && tags.badges.hasOwnProperty('broadcaster') && tags.badges.broadcaster === '1') return true;

    if(tags.badges != null && tags.badges != undefined){
        if(tags.badges.hasOwnProperty('vip')) return true;
        if(tags.badges.hasOwnProperty('moderator')) return true;
        if(tags.badges.hasOwnProperty('founder')) return true;
        if(tags.badges.hasOwnProperty('premium')) return true;
    }
}
 

function playSound(w){
    if(w === 'bofeton') sound.play(path.join(__dirname, "sounds/bofetón.mp3"), VOL);
    if(w === 'gemido') sound.play(path.join(__dirname, "sounds/gemido.mp3"), VOL);
    if(w === 'pedo') sound.play(path.join(__dirname, "sounds/pedo_normal.mp3"), VOL);
    if(w === 'pedomojado') sound.play(path.join(__dirname, "sounds/pedo_mojado.mp3"), VOL);
    if(w === 'sorpresa') sound.play(path.join(__dirname, "sounds/sorpresa_aplausos.mp3"), VOL);
    if(w === 'aplausos') sound.play(path.join(__dirname, "sounds/sorpresa_aplausos.mp3"), VOL);
    if(w === 'gota') sound.play(path.join(__dirname, "sounds/gota.mp3"), VOL);
    if(w === 'aplausos niños') sound.play(path.join(__dirname, "sounds/aplausosniños.mp3"), VOL);
    if(w === 'suspense') sound.play(path.join(__dirname, "sounds/suspense.mp3"), VOL);
}

function dimeMiRango(badge){
    let str = '';
    Object.keys(badge).forEach((rango, index) => {
        index === 0 ? str += rango : str += ', '+rango;
    });

    return `Rango/s: ${str}`;
}

const piropos = [
    'Quien fuera caramelo para poder derretirse en tu boca.',
    'Mi amor, tengo la caja fuerte para guardar ese lingote de oro.',
    '¿Y si nos comemos unos tacos y yo te a-taco a besos?',
    'Algún día Tom se comerá a Jerry, Silvestre a Piolín y yo a ti.',
    'No tengas miedo… sí que muerdo, pero muy suave.',
    'Quiero olvidarte, pero sin el “olvi”.',
    'Ni bañándome se me quitó todo lo sucio que quiero hacerte.',
    'Si, por otro lado, prefieres algunos Piropos de amor cortos y bonitos, en esta selección encontrarás ideas más light.',
    '¿Por qué en vez de un beso de buenas noches no me das una noche de buenos besos?',
    '¡Me encanta tu camisa! Creo que combinaría a la perfección con mis sábanas...',
    'Si yo fuera un avión y tú mi aeropuerto aterrizaría todos los días en tu exquisito cuerpo.',
    'Ojalá fueras sol y me dieras todo el día.',
    'Quisiera ser patata frita para acompañar ese lomo.',
    'Si fueras salsa, estaría mojando todo el día.',
    'Conmigo nunca te va a faltar amor. Y si te falta, lo hacemos…',
    'Tu ropa me da miedo. ¿Puedes quitártela?',
    'Dime como te llamas y así lograré ponerle un nombre a mis sueños',
    'Como mejor está ese cuerpo es sin ropa que lo adorne.',
    '¡Cuidado! Estás entrando en zona obligatoria de besos.',
    'Eres como la zapatilla de mi madre. Te veo venir y se me acelera el corazón.',
    'Ni en clase de matemáticas me pierdo tanto como en tu mirada...',
    'Estás como Paco… Paco-merte a besos.',
    'Mándame tu ubicación que quiero saber dónde está mi tesoro.',
    '¡Quién fuera paloma para posarme en esa rama!',
    'Ya tengo el Netflix, sólo me faltas tú a mi lado. Y date prisa, que sólo es el mes de prueba.',
    'Por darte un bocado me salto yo la dieta.',
    'Si vas a estar en mi cabeza todo el día, al menos ponte algo de ropa...',
    'Contigo me pasaría cien años en cuarentena.',
    'Ojalá te roben la cama y te vengas a dormir conmigo.',
    '¡Ya quisiera la Guardia Civil tener ese cuerpo!',
    'No sé si eres Bill Gates, pero pareces muy rico.',
    'Dicen que no hay hombre bueno, pero quiero descubrir si tú eres la excepción.',
    'Si estar bueno es un pecado, no tienes perdón de Dios.',
    'Si te gustan las alegrías, aquí tengo yo una para tu cuerpo.',
    '¡Aquí te dejamos otras Frases de amor chistosas y graciosas!',
    'No seré agricultor, pero si me dejas te planto unos besos.',
    'Entre nosotros hay más química que en toda la tabla periódica.',
    '¡Quién fuera cinturón para recorrer esa cintura!',
    'Si supieras cuánto pienso en ti me denunciarías por acoso mental.',
    'Cómo le gustaría a mi madre que tú fueses su nuera...',
    'Quién fuera zapatero para trabajar ese cuero.',
    '¿No te da claustrofobia pasar todo el día en mi cabeza?',
    '¡Qué perrito más mono! ¿Tiene número de teléfono?',
    'Adán se comió la manzana, pero yo por ti me comería la frutería entera...',
    'Si fuera alcalde te hacía una plaza en mitad del pueblo.',
    'El amor será ciego, pero hay que ver lo que alegras la vista...',
    'Qué bonitos son los días de viento para faldas como esa.',
    '¡Cuéntame qué comes para estar tan buena!',
    'Me gusta mucho una chica, pero no te voy a decir quién eres.',
    'Tarjeta amarilla por la falta que me haces.',
    'Lo mejor de ti es todo lo que te hace tan tú.',
    'Tienes algo pegado en el culo… ¡Mi mirada!',
    'Ni la miopía me impide ver lo guapa que eres.',
    'Si una amiga es un tesoro, tú eres una mina de oro.',
    '¡Con amigas como tú, quién necesita novio!',
    'Tú no necesitas que te dé el sol, tú brillas con luz propia.',
    'Por ti, mato un elefante a chancletazos.',
    'Aparte de la comida, tú eres lo que más me gusta.',
    'Sólo estoy a gusto cuando estoy contigo. Eres el pantalón del pijama de mi vida.',
    '¿Sabes por lo que estoy agradecida hoy? Por ser amigas. Y por la Nutella.',
    'No es fácil ser yo. Por eso te necesito a ti, amiga.',
    '¿Sabes lo que es increíble? Un pastel de chocolate... ¡ah, y tú tampoco estás mal!',
    'La parte más difícil de ser amigos es fingir que mis otros amigos me gustan tanto como tú.',
    'El amor será ciego, pero hay que ver lo mucho que alegras la vista.',
    'Con esos ojos mirándome, ya no me hace falta la luz del sol.',
    'Por la luna daría un beso, daría todo por el sol, pero por la luz de tu mirada, doy mi vida y corazón.',
    'Si yo fuera un avión y tu un aeropuerto, me la pasaría aterrizando por tu hermoso cuerpo.',
    'Me gusta el café, pero prefiero tener-té.',
    'No eres google, pero tienes todo lo que yo busco.',
    'Mis ganas de ti no se quitan, se acumulan.',
    'Cuando te multen por exceso de belleza, yo pagaré tu fianza.',
    'Si cada gota de agua sobre tu cuerpo es un beso, entonces quiero convertirme en aguacero.',
    'Estas como para invitarte a dormir, y no dormir.',
    'Si tu cuerpo fuera cárcel y tus brazos cadenas, ese sería el lugar perfecto para cumplir condena.',
    'Qué bonitos ojos tienes, tan redondos como el sol, se parecen a los ceros que me pone el profesor.'
];

const insultos = [
    'Hablando de madres: ¿es verdad que la tuya es tan gorda que tiene su propio código postal?',
    '¿Sabes?, yo podría haber sido tu padre, pero el tipo que estaba a mi lado tenía el dinero exacto',
    'Come-albóndigas',
    'Perroflauta',
    'Eres la versión antropomórfica de la Comic Sans',
    'Cara de limón podrído',
    'Eres más pesado que matar a un cerdo a besos',
    'Tienes halitosis…pero si lo supieras no hablarías tanto',
    'Tu mujer debe disfrutar cada vez que juegas. Más que nada porque por unas horas no tiene que aguantarte.',
    '¿Alguien te dijo alguna vez que eres una persona increíblemente promedio?',
    '¿Te das cuenta de que la gente solo te tolera?',
    'Deberías tratar de comer un poco de maquillaje para ser más bella por dentro.',
    'Disculpa pero tengo cosas mejores con las que perder el tiempo.',
    'Eres tan brillante como un agujero negro y el doble de denso.',
    'No tengo una respuesta apropiada para alguien de tu edad mental.',
    'Espero que el resto de tu día sea tan agradable como tú.',
    'Hay 7 trillones de nervios en el cuerpo humano, y tú irritas todos.',
    'La envidia es una enfermedad. Espero que te mejores.',
    'La gente feliz no tiene necesidad de amargar a los demás.',
    'Lástima que no puedas usar Photoshop en tu personalidad.',
    'Me asombra ver cómo le pones tanto entusiasmo a algo tan obvio.',
    'Me encanta cómo dices cosas obvias con la sensación de que descubriste algo.',
    'Me niego a pelear con un oponente desarmado.',
    'Mirar a alguien con impaciencia y decir: ¿Ya terminaste?',
    'No se qué cualidades puedes tener que compensen esa actitud que tienes.',
    'Puedo explicártelo pero no puedo entenderlo por ti.',
    'Que tengas un buen día, en cualquier otro lugar.',
    'Siento decirte que jamás pedí tu opinión. Gracias.',
    'Te devuelvo tu nariz. Se había metido en mis asuntos.',
    'Todas las personas que te amaron alguna vez estaban equivocados.',
    'Todo el mundo puede ser estúpido alguna vez, pero tú abusas del privilegio.',
    'Tu singular punto de vista nos ha dejado perplejo.',
    'Ya que lo sabes todo, sabrás cuándo callarte.',
    '¡Fuera! Eres veneno para mi sangre.',
    '¿Cuál es el parentesco entre tus padres?',
    'De no ser por la risa debería tenerte lastima.',
    'Jamás has usado una palabra que obligue a alguien a buscar un diccionario.',
    'Los asnos están hechos para cargar y, tu también.',
    'Me arrepiento de los tediosos minutos que he pasado contigo.',
    'No hay nada malo en ti que la reencarnación no pueda arreglar.',
    'No iré a tu funeral, pero enviaré una bonita carta aprobándolo.',
    'No tiene enemigos, pero es intensamente aborrecido por todos sus amigos.',
    'Tienes todas las virtudes que odio y ninguno de los vicios que admiro.',
    'Tu rostro es como febrero, lleno de escarcha, tormentas y nubosidad.'
];

function pickRandom(arr){
    const min = 0;
    const max = arr ? arr.length : 0;
    const rand = (Math.floor(Math.pow(10,14)*Math.random()*Math.random())%(max-min+1))+min;
    return arr[rand];
}

function dado(){
    const min = 1;
    const max = 6;
    const rand = (Math.floor(Math.pow(10,14)*Math.random()*Math.random())%(max-min+1))+min;
    return rand;
}
