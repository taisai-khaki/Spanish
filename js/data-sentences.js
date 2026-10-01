'use strict';
/* ============ A2 verb-variation practice & smart distractor bank ============
   Every A2 verb has one sentence for each of the 11 magic frames and 6
   Latin-American person forms (66 sentences per verb = 12,540 items).
   Each Word Order item includes 8 targeted distractors covering:
   - competing subjects / pronoun starters
   - different tenses (preterite, imperfect, future, conditional, present)
   - wrong person conjugations & competing auxiliary frames
   - conjugated / wrong-tense or wrong-reflexive forms of the target verb
   - related A2 vocabulary verbs in the matching form
   - competing connectors (que, a, de, por, para) ============ */
(function () {
  const PERSONS = [
    { id: 'yo', subject: 'Yo', englishSubject: 'I', reflexive: 'me', thirdSingular: false },
    { id: 'tu', subject: 'Tú', englishSubject: 'You (tú)', reflexive: 'te', thirdSingular: false },
    { id: 'el', subject: 'Él', englishSubject: 'He', reflexive: 'se', thirdSingular: true },
    { id: 'nosotros', subject: 'Nosotros', englishSubject: 'We', reflexive: 'nos', thirdSingular: false },
    { id: 'ellos', subject: 'Ellos', englishSubject: 'They', reflexive: 'se', thirdSingular: false },
    { id: 'ustedes', subject: 'Ustedes', englishSubject: 'You all (ustedes)', reflexive: 'se', thirdSingular: false },
  ];

  const FRAMES = [
    {
      id: 'necesitar', pattern: 'necesitar + infinitivo',
      forms: { yo: 'necesito', tu: 'necesitas', el: 'necesita', nosotros: 'necesitamos', ellos: 'necesitan', ustedes: 'necesitan' },
      tenses: {
        yo: ['necesité', 'necesitaba', 'necesitaré'],
        tu: ['necesitaste', 'necesitabas', 'necesitarás'],
        el: ['necesitó', 'necesitaba', 'necesitará'],
        nosotros: ['necesitábamos', 'necesitaremos', 'necesitaron'],
        ellos: ['necesitaron', 'necesitaban', 'necesitarán'],
        ustedes: ['necesitaron', 'necesitaban', 'necesitarán'],
      },
      english: (p, v) => `${p.englishSubject} ${p.thirdSingular ? 'needs' : 'need'} to ${v}`,
    },
    {
      id: 'tener-que', pattern: 'tener que + infinitivo',
      forms: { yo: 'tengo que', tu: 'tienes que', el: 'tiene que', nosotros: 'tenemos que', ellos: 'tienen que', ustedes: 'tienen que' },
      tenses: {
        yo: ['tuve', 'tenía', 'tendré'],
        tu: ['tuviste', 'tenías', 'tendrás'],
        el: ['tuvo', 'tenía', 'tendrá'],
        nosotros: ['tuvimos', 'teníamos', 'tendremos'],
        ellos: ['tuvieron', 'tenían', 'tendrán'],
        ustedes: ['tuvieron', 'tenían', 'tendrán'],
      },
      english: (p, v) => `${p.englishSubject} ${p.thirdSingular ? 'has' : 'have'} to ${v}`,
    },
    {
      id: 'querer', pattern: 'querer + infinitivo',
      forms: { yo: 'quiero', tu: 'quieres', el: 'quiere', nosotros: 'queremos', ellos: 'quieren', ustedes: 'quieren' },
      tenses: {
        yo: ['quise', 'quería', 'querría'],
        tu: ['quisiste', 'querías', 'querrías'],
        el: ['quiso', 'quería', 'querría'],
        nosotros: ['quisimos', 'queríamos', 'querríamos'],
        ellos: ['quisieron', 'querían', 'querrían'],
        ustedes: ['quisieron', 'querían', 'querrían'],
      },
      english: (p, v) => `${p.englishSubject} ${p.thirdSingular ? 'wants' : 'want'} to ${v}`,
    },
    {
      id: 'ir-a', pattern: 'ir a + infinitivo',
      forms: { yo: 'voy a', tu: 'vas a', el: 'va a', nosotros: 'vamos a', ellos: 'van a', ustedes: 'van a' },
      tenses: {
        yo: ['fui', 'iba', 'iré'],
        tu: ['fuiste', 'ibas', 'irás'],
        el: ['fue', 'iba', 'irá'],
        nosotros: ['fuimos', 'íbamos', 'iremos'],
        ellos: ['fueron', 'iban', 'irán'],
        ustedes: ['fueron', 'iban', 'irán'],
      },
      english: (p, v) => `${p.englishSubject} ${p.id === 'yo' ? 'am' : (p.id === 'el' ? 'is' : 'are')} going to ${v}`,
    },
    {
      id: 'poder', pattern: 'poder + infinitivo',
      forms: { yo: 'puedo', tu: 'puedes', el: 'puede', nosotros: 'podemos', ellos: 'pueden', ustedes: 'pueden' },
      tenses: {
        yo: ['pude', 'podía', 'podré'],
        tu: ['pudiste', 'podías', 'podrás'],
        el: ['pudo', 'podía', 'podrá'],
        nosotros: ['pudimos', 'podíamos', 'podremos'],
        ellos: ['pudieron', 'podían', 'podrán'],
        ustedes: ['pudieron', 'podían', 'podrán'],
      },
      english: (p, v) => `${p.englishSubject} can ${v}`,
    },
    {
      id: 'acabar-de', pattern: 'acabar de + infinitivo',
      forms: { yo: 'acabo de', tu: 'acabas de', el: 'acaba de', nosotros: 'acabamos de', ellos: 'acaban de', ustedes: 'acaban de' },
      tenses: {
        yo: ['acabé', 'acababa', 'acabaré'],
        tu: ['acabaste', 'acababas', 'acabarás'],
        el: ['acabó', 'acababa', 'acabará'],
        nosotros: ['acabábamos', 'acabaremos', 'acabaron'],
        ellos: ['acabaron', 'acababan', 'acabarán'],
        ustedes: ['acabaron', 'acababan', 'acabarán'],
      },
      english: (p, v) => `${p.englishSubject} ${p.thirdSingular ? 'has' : 'have'} just (${v})`,
    },
    {
      id: 'podria', pattern: 'podría + infinitivo',
      forms: { yo: 'podría', tu: 'podrías', el: 'podría', nosotros: 'podríamos', ellos: 'podrían', ustedes: 'podrían' },
      tenses: {
        yo: ['puedo', 'pude', 'podía'],
        tu: ['puedes', 'pudiste', 'podías'],
        el: ['puede', 'pudo', 'podía'],
        nosotros: ['podemos', 'pudimos', 'podíamos'],
        ellos: ['pueden', 'pudieron', 'podían'],
        ustedes: ['pueden', 'pudieron', 'podían'],
      },
      english: (p, v) => `${p.englishSubject} could ${v}`,
    },
    {
      id: 'deberia', pattern: 'debería + infinitivo',
      forms: { yo: 'debería', tu: 'deberías', el: 'debería', nosotros: 'deberíamos', ellos: 'deberían', ustedes: 'deberían' },
      tenses: {
        yo: ['debo', 'debí', 'debía'],
        tu: ['debes', 'debiste', 'debías'],
        el: ['debe', 'debió', 'debía'],
        nosotros: ['debemos', 'debimos', 'debíamos'],
        ellos: ['deben', 'debieron', 'debían'],
        ustedes: ['deben', 'debieron', 'debían'],
      },
      english: (p, v) => `${p.englishSubject} should ${v}`,
    },
    {
      id: 'soler', pattern: 'soler + infinitivo',
      forms: { yo: 'suelo', tu: 'sueles', el: 'suele', nosotros: 'solemos', ellos: 'suelen', ustedes: 'suelen' },
      tenses: {
        yo: ['solía', 'solíamos', 'acostumbro'],
        tu: ['solías', 'acostumbras', 'solían'],
        el: ['solía', 'acostumbra', 'solían'],
        nosotros: ['solíamos', 'acostumbramos', 'solían'],
        ellos: ['solían', 'acostumbran', 'solía'],
        ustedes: ['solían', 'acostumbran', 'solía'],
      },
      english: (p, v) => `${p.englishSubject} usually ${v}`,
    },
    {
      id: 'gustar', pattern: 'me gusta + infinitivo',
      forms: { yo: 'Me gusta', tu: 'Te gusta', el: 'A él le gusta', nosotros: 'Nos gusta', ellos: 'A ellos les gusta', ustedes: 'A ustedes les gusta' },
      tenses: {
        yo: ['gustó', 'gustaba', 'gustaría'],
        tu: ['gustó', 'gustaba', 'gustaría'],
        el: ['gustó', 'gustaba', 'gustaría'],
        nosotros: ['gustó', 'gustaba', 'gustaría'],
        ellos: ['gustó', 'gustaba', 'gustaría'],
        ustedes: ['gustó', 'gustaba', 'gustaría'],
      },
      english: (p, v) => `${p.englishSubject} ${p.thirdSingular ? 'likes' : 'like'} to ${v}`,
      useSubject: false,
    },
    {
      id: 'gustaria', pattern: 'me gustaría + infinitivo',
      forms: { yo: 'Me gustaría', tu: 'Te gustaría', el: 'A él le gustaría', nosotros: 'Nos gustaría', ellos: 'A ellos les gustaría', ustedes: 'A ustedes les gustaría' },
      tenses: {
        yo: ['gusta', 'gustó', 'gustaba'],
        tu: ['gusta', 'gustó', 'gustaba'],
        el: ['gusta', 'gustó', 'gustaba'],
        nosotros: ['gusta', 'gustó', 'gustaba'],
        ellos: ['gusta', 'gustó', 'gustaba'],
        ustedes: ['gusta', 'gustó', 'gustaba'],
      },
      english: (p, v) => `${p.englishSubject} would like to ${v}`,
      useSubject: false,
    },
  ];

  // Semantically related / contrasting A2 verbs (never exact synonyms)
  const RELATED_VERBS = {
    pagar: ['comprar', 'vender', 'gastar', 'ganar'],
    cobrar: ['pagar', 'comprar', 'gastar', 'vender'],
    comprar: ['vender', 'pagar', 'alquilar', 'buscar'],
    vender: ['comprar', 'pagar', 'guardar', 'ofrecer'],
    gastar: ['ganar', 'pagar', 'comprar', 'contar'],
    costar: ['pagar', 'comprar', 'vender', 'ganar'],
    alquilar: ['comprar', 'vender', 'pagar', 'limpiar'],
    ganar: ['perder', 'gastar', 'pagar', 'trabajar'],
    empezar: ['terminar', 'parar', 'esperar', 'descansar'],
    comenzar: ['terminar', 'parar', 'esperar', 'descansar'],
    terminar: ['empezar', 'continuar', 'esperar', 'parar'],
    acabar: ['empezar', 'continuar', 'seguir', 'esperar'],
    continuar: ['parar', 'terminar', 'empezar', 'descansar'],
    parar: ['seguir', 'correr', 'empezar', 'caminar'],
    seguir: ['parar', 'esperar', 'buscar', 'dejar'],
    cambiar: ['guardar', 'seguir', 'dejar', 'usar'],
    decidir: ['esperar', 'preferir', 'pensar', 'cambiar'],
    elegir: ['cambiar', 'guardar', 'buscar', 'dejar'],
    preferir: ['odiar', 'cambiar', 'elegir', 'buscar'],
    visitar: ['llamar', 'invitar', 'esperar', 'salir'],
    viajar: ['visitar', 'caminar', 'manejar', 'volar'],
    perder: ['encontrar', 'ganar', 'guardar', 'buscar'],
    encontrar: ['perder', 'buscar', 'guardar', 'dejar'],
    buscar: ['encontrar', 'perder', 'guardar', 'dejar'],
    contestar: ['preguntar', 'llamar', 'escribir', 'escuchar'],
    responder: ['preguntar', 'llamar', 'escribir', 'leer'],
    preguntar: ['contestar', 'explicar', 'escuchar', 'llamar'],
    pedir: ['dar', 'ofrecer', 'entregar', 'traer'],
    llegar: ['salir', 'esperar', 'viajar', 'correr'],
    salir: ['entrar', 'llegar', 'esperar', 'volver'],
    entrar: ['salir', 'bajar', 'subir', 'abrir'],
    venir: ['ir', 'salir', 'llegar', 'esperar'],
    ir: ['venir', 'llegar', 'salir', 'esperar'],
    regresar: ['salir', 'llegar', 'viajar', 'visitar'],
    volver: ['salir', 'llegar', 'entrar', 'esperar'],
    bajar: ['subir', 'entrar', 'salir', 'caminar'],
    subir: ['bajar', 'entrar', 'salir', 'correr'],
    ser: ['estar', 'tener', 'parecer', 'vivir'],
    estar: ['ser', 'vivir', 'trabajar', 'esperar'],
    tener: ['querer', 'necesitar', 'dar', 'perder'],
    haber: ['estar', 'tener', 'ser', 'hacer'],
    poder: ['querer', 'saber', 'deber', 'intentar'],
    deber: ['poder', 'querer', 'tener', 'saber'],
    querer: ['odiar', 'necesitar', 'preferir', 'esperar'],
    necesitar: ['querer', 'tener', 'buscar', 'dar'],
    creer: ['saber', 'pensar', 'esperar', 'olvidar'],
    pensar: ['hablar', 'decidir', 'recordar', 'creer'],
    saber: ['olvidar', 'aprender', 'preguntar', 'pensar'],
    conocer: ['visitar', 'buscar', 'recordar', 'invitar'],
    reconocer: ['olvidar', 'buscar', 'mirar', 'recordar'],
    recordar: ['olvidar', 'pensar', 'apuntar', 'buscar'],
    olvidar: ['recordar', 'apuntar', 'guardar', 'saber'],
    entender: ['explicar', 'olvidar', 'preguntar', 'aprender'],
    comprender: ['explicar', 'olvidar', 'preguntar', 'estudiar'],
    aprender: ['enseñar', 'olvidar', 'practicar', 'leer'],
    enseñar: ['aprender', 'estudiar', 'leer', 'escuchar'],
    estudiar: ['trabajar', 'descansar', 'jugar', 'enseñar'],
    practicar: ['estudiar', 'descansar', 'empezar', 'mirar'],
    trabajar: ['descansar', 'estudiar', 'jugar', 'dormir'],
    descansar: ['trabajar', 'correr', 'limpiar', 'estudiar'],
    dormir: ['despertar', 'trabajar', 'correr', 'caminar'],
    traer: ['llevar', 'dejar', 'sacar', 'guardar'],
    llevar: ['traer', 'dejar', 'guardar', 'recoger'],
    dejar: ['tomar', 'llevar', 'guardar', 'recoger'],
    poner: ['sacar', 'guardar', 'dejar', 'recoger'],
    sacar: ['poner', 'guardar', 'traer', 'llevar'],
    guardar: ['sacar', 'perder', 'usar', 'dejar'],
    recoger: ['dejar', 'llevar', 'limpiar', 'guardar'],
    entregar: ['recibir', 'guardar', 'pedir', 'buscar'],
    recibir: ['dar', 'entregar', 'perder', 'pedir'],
    dar: ['recibir', 'pedir', 'guardar', 'buscar'],
    regalar: ['comprar', 'recibir', 'vender', 'guardar'],
    ofrecer: ['pedir', 'recibir', 'aceptar', 'buscar'],
    aceptar: ['evitar', 'cancelar', 'pedir', 'cambiar'],
    cancelar: ['aceptar', 'planear', 'organizar', 'confirmar'],
    devolver: ['pedir', 'guardar', 'comprar', 'llevar'],
    llamar: ['contestar', 'escribir', 'visitar', 'esperar'],
    limpiar: ['cocinar', 'lavar', 'abrir', 'romper'],
    lavar: ['limpiar', 'cocinar', 'guardar', 'secar'],
    cerrar: ['abrir', 'limpiar', 'guardar', 'dejar'],
    abrir: ['cerrar', 'romper', 'limpiar', 'tocar'],
    prender: ['apagar', 'abrir', 'cerrar', 'romper'],
    apagar: ['prender', 'cerrar', 'abrir', 'limpiar'],
    cocinar: ['comer', 'limpiar', 'lavar', 'comprar'],
    comer: ['cocinar', 'beber', 'pedir', 'servir'],
    beber: ['comer', 'cocinar', 'servir', 'pedir'],
    tomar: ['dejar', 'comer', 'llevar', 'poner'],
    desayunar: ['cenar', 'almorzar', 'cocinar', 'dormir'],
    almorzar: ['desayunar', 'cenar', 'cocinar', 'trabajar'],
    cenar: ['desayunar', 'almorzar', 'cocinar', 'salir'],
    freír: ['cocinar', 'cortar', 'comer', 'servir'],
    probar: ['cocinar', 'servir', 'elegir', 'preferir'],
    servir: ['cocinar', 'comer', 'pedir', 'traer'],
    contar: ['escuchar', 'leer', 'escribir', 'olvidar'],
    bailar: ['cantar', 'correr', 'caminar', 'escuchar'],
    cantar: ['bailar', 'escuchar', 'hablar', 'tocar'],
    tocar: ['escuchar', 'cantar', 'mirar', 'guardar'],
    jugar: ['trabajar', 'estudiar', 'descansar', 'correr'],
    hacer: ['deshacer', 'dejar', 'romper', 'mirar'],
    manejar: ['caminar', 'estacionar', 'viajar', 'correr'],
    conducir: ['caminar', 'estacionar', 'viajar', 'volar'],
    estacionar: ['manejar', 'parar', 'salir', 'esperar'],
    caminar: ['correr', 'manejar', 'nadar', 'parar'],
    correr: ['caminar', 'nadar', 'parar', 'descansar'],
    volar: ['nadar', 'correr', 'viajar', 'caminar'],
    nadar: ['correr', 'caminar', 'bailar', 'jugar'],
    disfrutar: ['odiar', 'evitar', 'llorar', 'trabajar'],
    amar: ['odiar', 'olvidar', 'extrañar', 'esperar'],
    odiar: ['amar', 'preferir', 'disfrutar', 'querer'],
    extrañar: ['olvidar', 'visitar', 'llamar', 'ver'],
    abrazar: ['besar', 'saludar', 'mirar', 'llamar'],
    besar: ['abrazar', 'mirar', 'hablar', 'sonreír'],
    sonreír: ['llorar', 'mirar', 'hablar', 'cantar'],
    llorar: ['sonreír', 'cantar', 'hablar', 'dormir'],
    oír: ['ver', 'decir', 'hablar', 'llamar'],
    escuchar: ['hablar', 'mirar', 'cantar', 'leer'],
    ver: ['oír', 'buscar', 'mostrar', 'ocultar'],
    mirar: ['escuchar', 'tocar', 'buscar', 'leer'],
    mostrar: ['ocultar', 'guardar', 'mirar', 'buscar'],
    leer: ['escribir', 'hablar', 'escuchar', 'borrar'],
    escribir: ['leer', 'borrar', 'escuchar', 'hablar'],
    copiar: ['borrar', 'escribir', 'leer', 'crear'],
    borrar: ['escribir', 'copiar', 'apuntar', 'guardar'],
    apuntar: ['borrar', 'olvidar', 'leer', 'decir'],
    hablar: ['escuchar', 'escribir', 'leer', 'pensar'],
    decir: ['escuchar', 'preguntar', 'pensar', 'escribir'],
    explicar: ['preguntar', 'escuchar', 'aprender', 'leer'],
    describir: ['mostrar', 'escribir', 'leer', 'mirar'],
    repetir: ['escuchar', 'leer', 'escribir', 'olvidar'],
    avisar: ['llamar', 'esperar', 'olvidar', 'preguntar'],
    contactar: ['visitar', 'esperar', 'buscar', 'invitar'],
    ayudar: ['esperar', 'llamar', 'buscar', 'mirar'],
    esperar: ['salir', 'llegar', 'buscar', 'llamar'],
    vivir: ['trabajar', 'viajar', 'estudiar', 'salir'],
    pasar: ['parar', 'esperar', 'llegar', 'salir'],
    compartir: ['guardar', 'comprar', 'pedir', 'vender'],
    doblar: ['cruzar', 'parar', 'seguir', 'cortar'],
    girar: ['cruzar', 'parar', 'seguir', 'caminar'],
    cruzar: ['girar', 'doblar', 'parar', 'caminar'],
    usar: ['guardar', 'comprar', 'romper', 'dejar'],
    agregar: ['sacar', 'borrar', 'cortar', 'dividir'],
    incluir: ['sacar', 'borrar', 'dividir', 'evitar'],
    dividir: ['unir', 'agregar', 'incluir', 'contar'],
    asistir: ['faltar', 'salir', 'cancelar', 'organizar'],
    evitar: ['buscar', 'aceptar', 'incluir', 'probar'],
    romper: ['limpiar', 'abrir', 'cortar', 'guardar'],
    cortar: ['doblar', 'limpiar', 'abrir', 'guardar'],
    celebrar: ['organizar', 'invitar', 'cancelar', 'trabajar'],
    invitar: ['visitar', 'llamar', 'aceptar', 'esperar'],
    organizar: ['cancelar', 'limpiar', 'planear', 'empezar'],
    planear: ['cancelar', 'empezar', 'terminar', 'olvidar'],
    cubrir: ['abrir', 'sacar', 'limpiar', 'mostrar'],
    llenar: ['limpiar', 'abrir', 'cerrar', 'sacar'],
    chocar: ['parar', 'manejar', 'doblar', 'cruzar'],
    crear: ['romper', 'borrar', 'copiar', 'cambiar'],
    curar: ['cuidar', 'ayudar', 'descansar', 'dormir'],
    morir: ['vivir', 'nacer', 'dormir', 'caer'],
    experimentar: ['probar', 'aprender', 'recordar', 'pensar'],
    sentir: ['pensar', 'creer', 'mirar', 'oír'],
    pelear: ['hablar', 'ayudar', 'compartir', 'escuchar'],
    guiar: ['seguir', 'buscar', 'caminar', 'mostrar'],
    mover: ['parar', 'dejar', 'guardar', 'poner'],
    llover: ['nevar', 'empezar', 'parar', 'pasar'],
    nevar: ['llover', 'empezar', 'parar', 'pasar'],
    recomendar: ['pedir', 'probar', 'elegir', 'buscar'],
    // Reflexive verbs (matched against other reflexive verbs)
    bañarse: ['vestirse', 'cepillarse', 'levantarse', 'sentarse'],
    ducharse: ['vestirse', 'cepillarse', 'levantarse', 'sentarse'],
    lavarse: ['vestirse', 'levantarse', 'sentarse', 'quedarse'],
    cepillarse: ['vestirse', 'levantarse', 'bañarse', 'sentarse'],
    vestirse: ['quitarse', 'bañarse', 'levantarse', 'sentarse'],
    quitarse: ['vestirse', 'lavarse', 'levantarse', 'sentarse'],
    despertarse: ['levantarse', 'vestirse', 'sentarse', 'quedarse'],
    levantarse: ['sentarse', 'quedarse', 'vestirse', 'irse'],
    sentarse: ['levantarse', 'irse', 'vestirse', 'quedarse'],
    quedarse: ['irse', 'mudarse', 'levantarse', 'sentarse'],
    irse: ['quedarse', 'sentarse', 'unirse', 'levantarse'],
    mudarse: ['quedarse', 'irse', 'encontrarse', 'sentarse'],
    llamarse: ['comunicarse', 'encontrarse', 'verse', 'quedarse'],
    calmarse: ['relajarse', 'levantarse', 'sentarse', 'irse'],
    relajarse: ['ejercitarse', 'levantarse', 'vestirse', 'irse'],
    ejercitarse: ['relajarse', 'sentarse', 'quedarse', 'vestirse'],
    comunicarse: ['irse', 'quedarse', 'encontrarse', 'sentarse'],
    caerse: ['levantarse', 'sentarse', 'quedarse', 'irse'],
    sentirse: ['verse', 'llamarse', 'quedarse', 'irse'],
    divertirse: ['relajarse', 'calmarse', 'quedarse', 'irse'],
    unirse: ['irse', 'quedarse', 'sentarse', 'encontrarse'],
    reírse: ['calmarse', 'sentarse', 'quedarse', 'irse'],
    verse: ['irse', 'llamarse', 'quedarse', 'sentarse'],
    encontrarse: ['irse', 'quedarse', 'sentarse', 'levantarse'],
  };

  // Irregular conjugated forms (preterite, imperfect, present) for target verb distractors
  const IRREGULAR_FINITE = {
    ser: ['fue', 'era', 'soy', 'eres'],
    estar: ['estuvo', 'estaba', 'estoy', 'estás'],
    ir: ['fue', 'iba', 'voy', 'vas'],
    tener: ['tuvo', 'tenía', 'tengo', 'tienes'],
    hacer: ['hizo', 'hacía', 'hago', 'haces'],
    poder: ['pudo', 'podía', 'puedo', 'puedes'],
    poner: ['puso', 'ponía', 'pongo', 'pones'],
    decir: ['dijo', 'decía', 'digo', 'dices'],
    traer: ['trajo', 'traía', 'traigo', 'traes'],
    venir: ['vino', 'venía', 'vengo', 'vienes'],
    saber: ['supo', 'sabía', 'sé', 'sabes'],
    querer: ['quiso', 'quería', 'quiero', 'quieres'],
    dar: ['dio', 'daba', 'doy', 'das'],
    ver: ['vio', 'veía', 'veo', 'ves'],
    oír: ['oyó', 'oía', 'oigo', 'oyes'],
    leer: ['leyó', 'leía', 'leo', 'lees'],
    dormir: ['durmió', 'dormía', 'duermo', 'duermes'],
    pedir: ['pidió', 'pedía', 'pido', 'pides'],
    seguir: ['siguió', 'seguía', 'sigo', 'sigues'],
    preferir: ['prefirió', 'prefería', 'prefiero', 'prefieres'],
    sentir: ['sintió', 'sentía', 'siento', 'sientes'],
    servir: ['sirvió', 'servía', 'sirvo', 'sirves'],
    repetir: ['repitió', 'repetía', 'repito', 'repites'],
    elegir: ['eligió', 'elegía', 'elijo', 'eliges'],
    morir: ['murió', 'moría', 'muero', 'mueres'],
    conducir: ['condujo', 'conducía', 'conduzco', 'conduces'],
    conocer: ['conoció', 'conocía', 'conozco', 'conoces'],
    ofrecer: ['ofreció', 'ofrecía', 'ofrezco', 'ofreces'],
    salir: ['salió', 'salía', 'salgo', 'sales'],
    jugar: ['jugó', 'jugaba', 'juego', 'juegas'],
    empezar: ['empezó', 'empezaba', 'empiezo', 'empiezas'],
    comenzar: ['comenzó', 'comenzaba', 'comienzo', 'comienzas'],
    pensar: ['pensó', 'pensaba', 'pienso', 'piensas'],
    cerrar: ['cerró', 'cerraba', 'cierro', 'cierras'],
    entender: ['entendió', 'entendía', 'entiendo', 'entiendes'],
    perder: ['perdió', 'perdía', 'pierdo', 'pierdes'],
    volver: ['volvió', 'volvía', 'vuelvo', 'vuelves'],
    devolver: ['devolvió', 'devolvía', 'devuelvo', 'devuelves'],
    encontrar: ['encontró', 'encontraba', 'encuentro', 'encuentras'],
    recordar: ['recordó', 'recordaba', 'recuerdo', 'recuerdas'],
    contar: ['contó', 'contaba', 'cuento', 'cuentas'],
    costar: ['costó', 'costaba', 'cuesta', 'cuestan'],
    probar: ['probó', 'probaba', 'pruebo', 'pruebas'],
    almorzar: ['almorzó', 'almorzaba', 'almuerzo', 'almuerzas'],
    llover: ['llovió', 'llovía', 'llueve', 'lloverá'],
    nevar: ['nevó', 'nevaba', 'nieva', 'nevará'],
    haber: ['hubo', 'había', 'habrá', 'hay'],
  };

  function normalize(s) {
    return String(s || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[¿?¡!.,;:()"'´`\/-]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function slug(s) {
    return normalize(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function hashStr(s) {
    return Array.from(String(s || '')).reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
  }

  // Strip punctuation so first/last words are never given away by periods or question marks
  function tokenize(s) {
    return String(s || '').match(/[\p{L}\p{M}\p{N}]+/gu) || [];
  }

  function englishGloss(translation) {
    return String(translation || '').split('/')[0]
      .replace(/\([^)]*\)/g, '').trim().replace(/^to\s+/i, '');
  }

  function infinitiveFor(verbOrEs, person) {
    const lemma = String(typeof verbOrEs === 'string' ? verbOrEs : verbOrEs.es).trim();
    return lemma.endsWith('se') ? lemma.slice(0, -2) + person.reflexive : lemma;
  }

  function finiteDistractorsForVerb(verbEs, person) {
    const lemma = String(verbEs || '').trim();
    if (lemma.endsWith('se')) {
      const base = lemma.slice(0, -2);
      const stem = base.slice(0, -2);
      const isAr = base.endsWith('ar');
      const wrongClitics = ['se', 'me', 'te', 'nos']
        .filter(c => c !== person.reflexive)
        .map(c => base + c);
      return wrongClitics.concat([
        stem + (isAr ? 'ó' : 'ió'),
        stem + (isAr ? 'aba' : 'ía'),
      ]);
    }
    if (IRREGULAR_FINITE[lemma]) return IRREGULAR_FINITE[lemma];
    const stem = lemma.slice(0, -2);
    if (lemma.endsWith('ar')) {
      return [stem + 'ó', stem + 'aba', stem + 'o', stem + 'ando'];
    }
    return [stem + 'ió', stem + 'ía', stem + 'o', stem + 'iendo'];
  }

  function relatedInfinitivesForVerb(verbEs, person, allVerbs, h) {
    const lemma = String(verbEs || '').trim();
    const isRefl = lemma.endsWith('se');
    let pool = RELATED_VERBS[lemma] ? RELATED_VERBS[lemma].slice() : [];
    if (pool.length < 3) {
      const fallback = allVerbs
        .map(v => v.es)
        .filter(es => es !== lemma && es.endsWith('se') === isRefl);
      for (let i = 0; i < fallback.length && pool.length < 4; i++) {
        const cand = fallback[(h + i * 7) % fallback.length];
        if (!pool.includes(cand)) pool.push(cand);
      }
    }
    return pool.map(es => infinitiveFor(es, person));
  }

  const SUBJECT_STARTERS = ['Yo', 'Tú', 'Él', 'Ella', 'Nosotros', 'Ellos', 'Ustedes'];
  const GUSTAR_CAP_STARTERS = ['Me', 'Te', 'Nos', 'Le', 'Les', 'Yo', 'Tú'];
  const GUSTAR_PRONOUNS = ['me', 'te', 'le', 'nos', 'les', 'él', 'ella', 'ellos', 'ustedes', 'mí'];
  const COMPETING_MAGIC_BY_PERSON = {
    yo: ['necesito', 'quiero', 'puedo', 'debería', 'suelo', 'tengo', 'voy'],
    tu: ['necesitas', 'quieres', 'puedes', 'deberías', 'sueles', 'tienes', 'vas'],
    el: ['necesita', 'quiere', 'puede', 'debería', 'suele', 'tiene', 'va'],
    nosotros: ['necesitamos', 'queremos', 'podemos', 'deberíamos', 'solemos', 'tenemos', 'vamos'],
    ellos: ['necesitan', 'quieren', 'pueden', 'deberían', 'suelen', 'tienen', 'van'],
    ustedes: ['necesitan', 'quieren', 'pueden', 'deberían', 'suelen', 'tienen', 'van'],
  };
  const CONNECTORS = ['que', 'a', 'de', 'por', 'para'];

  function distractorsForVerbSentence(id, answer, verb, frame, person, allVerbs) {
    const used = new Set(answer.map(normalize));
    const h = hashStr(id);
    const out = [];
    const tryAdd = word => {
      if (!word) return false;
      const clean = String(word).trim();
      const key = normalize(clean);
      if (!key || clean.includes(' ') || used.has(key)) return false;
      used.add(key);
      out.push(clean);
      return true;
    };

    // 1. Two competing subject / pronoun starters
    const subjPool = frame.useSubject === false
      ? (['yo', 'tu', 'nosotros'].includes(person.id) ? GUSTAR_CAP_STARTERS : GUSTAR_PRONOUNS)
      : SUBJECT_STARTERS;
    let addedSubj = 0;
    for (let i = 0; i < subjPool.length && addedSubj < 2; i++) {
      if (tryAdd(subjPool[(h + i) % subjPool.length])) addedSubj++;
    }

    // 2. Two wrong-tense forms of the same frame verb (past preterite / imperfect / future / conditional)
    const tensePool = (frame.tenses && frame.tenses[person.id]) || [];
    let addedTense = 0;
    for (let i = 0; i < tensePool.length && addedTense < 2; i++) {
      if (tryAdd(tensePool[(h + i) % tensePool.length])) addedTense++;
    }

    // 3. One wrong-person form of the same frame OR competing magic verb in the same person
    const otherPersons = PERSONS.filter(p => p.id !== person.id)
      .map(p => tokenize(frame.forms[p.id])[0]);
    const magicPool = otherPersons.concat(COMPETING_MAGIC_BY_PERSON[person.id] || []);
    for (let i = 0; i < magicPool.length; i++) {
      if (tryAdd(magicPool[(h + i) % magicPool.length])) break;
    }

    // 4. One conjugated / wrong-tense or wrong-clitic form of the target verb itself
    const finitePool = finiteDistractorsForVerb(verb.es, person);
    for (let i = 0; i < finitePool.length; i++) {
      if (tryAdd(finitePool[(h + i) % finitePool.length])) break;
    }

    // 5. Two semantically related / contrasting A2 verbs in matching infinitive/reflexive form
    const relPool = relatedInfinitivesForVerb(verb.es, person, allVerbs, h);
    let addedRel = 0;
    for (let i = 0; i < relPool.length && addedRel < 2; i++) {
      if (tryAdd(relPool[(h + i) % relPool.length])) addedRel++;
    }

    // 6. Fill up to 8 distractors with competing connectors and magic/tense forms
    const extras = CONNECTORS.concat(magicPool, tensePool, finitePool, relPool);
    for (let i = 0; i < extras.length && out.length < 8; i++) {
      tryAdd(extras[(h + i) % extras.length]);
    }

    return out;
  }

  function buildVerbSentenceBank(level, verbs, frames = FRAMES) {
    const items = [];
    const uniqueVerbs = Array.from(new Map((verbs || []).map(v => [v.es, v])).values());
    uniqueVerbs.forEach(verb => {
      const gloss = englishGloss(verb.en);
      frames.forEach(frame => PERSONS.forEach(person => {
        const id = `${level}-verb-${slug(verb.es)}-${frame.id}-${person.id}`;
        const prefix = frame.useSubject === false
          ? frame.forms[person.id]
          : `${person.subject} ${frame.forms[person.id]}`;
        const es = `${prefix} ${infinitiveFor(verb, person)}.`;
        const ans = tokenize(es);
        items.push({
          id,
          es,
          en: frame.english(person, gloss),
          ans,
          distr: distractorsForVerbSentence(id, ans, verb, frame, person, uniqueVerbs),
          explain: `Use the ${frame.pattern} frame; the second verb stays in the infinitive.`,
          verbId: verb.es,
          frameId: frame.id,
          frameLabel: frame.pattern,
          personId: person.id,
          mastery: 'correct-once',
        });
      }));
    });
    return items;
  }

  DATA.levels.forEach(level => {
    const levelData = DATA[level];
    if (!levelData) return;
    levelData.verbSentences = buildVerbSentenceBank(level, levelData.verbs || []);
    levelData.verbFrames = FRAMES.map(frame => ({ id: frame.id, label: frame.pattern }));
  });

  // Enrich every sentence in DATA.A2.sentences so tokens have no punctuation giveaways and at least 8 smart distractors
  const RELATED_WORDS = {
    cuenta: ['propina', 'carta', 'mesa', 'comida'],
    teléfono: ['mensaje', 'correo', 'puerta', 'número'],
    tarea: ['clase', 'trabajo', 'examen', 'libro'],
    aeropuerto: ['estación', 'hotel', 'centro', 'museo'],
    ventana: ['puerta', 'mesa', 'cajón', 'casa'],
    hermana: ['hermano', 'madre', 'amiga', 'vecina'],
    hermano: ['hermana', 'padre', 'amigo', 'vecino'],
    madre: ['padre', 'hermana', 'abuela', 'tía'],
    habitación: ['cocina', 'casa', 'oficina', 'sala'],
    familia: ['amigos', 'vecinos', 'padres', 'hermanos'],
    amigos: ['vecinos', 'hermanos', 'padres', 'primos'],
    cita: ['clase', 'reunión', 'fiesta', 'cena'],
    llaves: ['boletos', 'maletas', 'libros', 'platos'],
    mesa: ['silla', 'cama', 'puerta', 'cajón'],
    clase: ['cita', 'reunión', 'película', 'fiesta'],
    autobús: ['tren', 'taxi', 'avión', 'metro'],
    tren: ['autobús', 'avión', 'taxi', 'metro'],
    taxi: ['autobús', 'tren', 'metro', 'carro'],
    mensaje: ['libro', 'correo', 'número', 'carta'],
    película: ['libro', 'música', 'clase', 'cena'],
    pasaporte: ['boleto', 'equipaje', 'maleta', 'cartera'],
    mochila: ['maleta', 'bolsa', 'camisa', 'cartera'],
    boletos: ['maletas', 'llaves', 'libros', 'zapatos'],
    maletas: ['boletos', 'mochilas', 'llaves', 'camisas'],
    camisa: ['chaqueta', 'falda', 'mochila', 'maleta'],
    hotel: ['banco', 'museo', 'aeropuerto', 'hospital'],
    agua: ['café', 'leche', 'jugo', 'té'],
    café: ['té', 'agua', 'leche', 'jugo'],
    vuelo: ['tren', 'autobús', 'hotel', 'boleto'],
    playa: ['montaña', 'plaza', 'estación', 'ciudad'],
    estación: ['aeropuerto', 'playa', 'plaza', 'farmacia'],
    llamada: ['carta', 'visita', 'cita', 'noticia'],
    dirección: ['número', 'nombre', 'fecha', 'hora'],
    vecinos: ['amigos', 'hermanos', 'padres', 'clientes'],
    palabras: ['frases', 'preguntas', 'canciones', 'historias'],
    invitación: ['regalo', 'mensaje', 'cuenta', 'cita'],
    puerta: ['ventana', 'mesa', 'luz', 'calle'],
    luz: ['puerta', 'ventana', 'televisión', 'radio'],
    libro: ['mensaje', 'periódico', 'carta', 'revista'],
    médico: ['profesor', 'vecino', 'hermano', 'cliente'],
    departamento: ['casa', 'hotel', 'oficina', 'cuarto'],
    indicaciones: ['reglas', 'noticias', 'calles', 'señales'],
    platos: ['vasos', 'camisas', 'pisos', 'mesas'],
    cena: ['desayuno', 'comida', 'almuerzo', 'postre'],
    restaurante: ['hotel', 'mercado', 'museo', 'banco'],
    postre: ['café', 'sopa', 'ensalada', 'pan'],
    comida: ['cena', 'bebida', 'cuenta', 'música'],
    vaso: ['plato', 'taza', 'botella', 'espejo'],
    trabajo: ['escuela', 'cine', 'parque', 'mercado'],
    farmacia: ['panadería', 'tienda', 'escuela', 'estación'],
    banco: ['hotel', 'museo', 'parque', 'correo'],
    museo: ['cine', 'teatro', 'parque', 'mercado'],
    mi: ['tu', 'su', 'nuestro'],
    mis: ['tus', 'sus', 'nuestros'],
    tu: ['mi', 'su', 'nuestra'],
    tus: ['mis', 'sus', 'nuestros'],
    nuestra: ['nuestro', 'suya', 'mía', 'tuya'],
    nuestros: ['nuestras', 'mis', 'sus', 'tus'],
  };

  const EXTRA_A2_DISTRACTORS = [
    'Yo', 'Tú', 'Él', 'Ella', 'Nosotros', 'Ellos', 'Ustedes', 'Ayer', 'Hoy', 'Mañana',
    'fui', 'iba', 'voy', 'tuve', 'tenía', 'tengo', 'hice', 'hacía', 'pude', 'podía',
    'quise', 'quería', 'estuve', 'estaba', 'era', 'fue', 'será', 'había', 'hubo',
    'por', 'para', 'desde', 'hasta', 'durante', 'aunque', 'porque', 'cuando', 'mientras',
    'pero', 'sin', 'sobre', 'entre', 'este', 'esta', 'esos', 'aquella', 'mi', 'tu', 'su',
  ];

  function cleanTokenList(tokens) {
    const out = [];
    (tokens || []).forEach(tok => {
      tokenize(tok).forEach(w => out.push(w));
    });
    return out;
  }

  function enrichA2Sentences(sentences) {
    (sentences || []).forEach((s, idx) => {
      s.ans = cleanTokenList(s.ans);
      const used = new Set(s.ans.map(normalize));
      const cleanDistr = [];
      const tryAdd = w => {
        if (!w) return false;
        const k = normalize(w);
        if (!k || used.has(k)) return false;
        used.add(k);
        cleanDistr.push(w);
        return true;
      };
      cleanTokenList(s.distr).forEach(tryAdd);
      const h = hashStr(s.es || String(idx));

      // Add related nouns/possessives/verbs based on tokens present in s.ans
      s.ans.forEach(tok => {
        const lower = tok.toLowerCase();
        const rel = RELATED_WORDS[lower] || RELATED_VERBS[lower];
        if (rel && cleanDistr.length < 8) {
          tryAdd(rel[h % rel.length]);
        }
      });

      // If the first answer word is capitalized, ensure at least 2 capitalized distractors exist
      const capPool = ['Yo', 'Tú', 'Él', 'Ella', 'Nosotros', 'Ellos', 'Ustedes', 'Ayer', 'Hoy', 'Mañana', 'Este', 'Esta', 'Cuando', 'Aunque'];
      let capCount = cleanDistr.filter(w => /^[A-ZÁÉÍÓÚÑ]/.test(w)).length;
      for (let i = 0; i < capPool.length && capCount < 2; i++) {
        if (tryAdd(capPool[(h + i) % capPool.length])) capCount++;
      }
      for (let i = 0; i < EXTRA_A2_DISTRACTORS.length && cleanDistr.length < 8; i++) {
        tryAdd(EXTRA_A2_DISTRACTORS[(h + i * 3) % EXTRA_A2_DISTRACTORS.length]);
      }
      s.distr = cleanDistr;
    });
  }

  if (DATA.A2) {
    enrichA2Sentences(DATA.A2.sentences);
  }

  /* ============ Word-Order Grammar Coverage for Grammar Judge (A1–B2) ============ */
  const WORD_ORDER_GRAMMAR_BY_LEVEL = {
    A1: [
      {
        id: 'g-a1-wo-1',
        en: 'I am from Spain.',
        correct: 'Soy de España.',
        wrongs: ['Estoy de España.', 'Soy en España.'],
        explain: 'Origin uses <b>ser + de</b>: <i>Soy de España</i>.',
      },
      {
        id: 'g-a1-wo-2',
        en: 'I have two cats.',
        correct: 'Tengo dos gatos.',
        wrongs: ['Soy dos gatos.', 'Tienes dos gatos.'],
        explain: 'Possession uses <b>tener</b> (yo → <i>tengo</i>).',
      },
      {
        id: 'g-a1-wo-3',
        en: 'I want a coffee, please.',
        correct: 'Quiero un café, por favor.',
        wrongs: ['Quiero una café, por favor.', 'Querer un café, por favor.'],
        explain: '<b>Querer</b> has an e→ie stem change (<i>quiero</i>), and <i>café</i> is masculine (<i>un café</i>).',
      },
      {
        id: 'g-a1-wo-4',
        en: 'Do you speak English?',
        correct: '¿Hablas inglés?',
        wrongs: ['¿Habla inglés?', '¿Hablar inglés?'],
        explain: 'Present tense <b>tú</b> form of <i>-ar</i> verbs ends in <b>-as</b>: <i>hablas</i>.',
      },
      {
        id: 'g-a1-wo-5',
        en: 'I do not understand.',
        correct: 'No entiendo.',
        wrongs: ['Entiendo no.', 'No entender.'],
        explain: 'Place <b>no</b> directly before the conjugated verb: <i>No entiendo</i>.',
      },
      {
        id: 'g-a1-wo-6',
        en: 'I can help you.',
        correct: 'Puedo ayudarte.',
        wrongs: ['Puedo te ayudar.', 'Puedo ayudo te.'],
        explain: 'With <b>poder + infinitivo</b>, attach the object pronoun to the infinitive: <i>puedo ayudarte</i>.',
      },
      {
        id: 'g-a1-wo-7',
        en: 'I am learning Spanish.',
        correct: 'Estoy aprendiendo español.',
        wrongs: ['Soy aprendiendo español.', 'Estoy aprender español.'],
        explain: 'Present progressive uses <b>estar + gerundio (-ando/-iendo)</b>: <i>estoy aprendiendo</i>.',
      },
      {
        id: 'g-a1-wo-8',
        en: 'See you tomorrow.',
        correct: 'Nos vemos mañana.',
        wrongs: ['Vemos nos mañana.', 'Se vemos mañana.'],
        explain: 'Reciprocal pronoun <b>nos</b> goes before the conjugated verb: <i>Nos vemos mañana</i>.',
      },
    ],
    A2: [
      {
        id: 'g-a2-wo-1',
        en: 'He likes to pay with a card.',
        correct: 'A él le gusta pagar con tarjeta.',
        wrongs: ['Él gusta pagar con tarjeta.', 'A él la gusta pagar con tarjeta.'],
        explain: 'With <b>gustar</b> in 3rd person singular, use <b>A él le gusta + infinitivo</b>.',
      },
      {
        id: 'g-a2-wo-2',
        en: 'You all (ustedes) like to travel.',
        correct: 'A ustedes les gusta viajar.',
        wrongs: ['Ustedes gustan viajar.', 'A ustedes le gusta viajar.'],
        explain: 'For <i>ustedes</i> or <i>ellos</i>, use <b>A ustedes/ellos les gusta + infinitivo</b>.',
      },
      {
        id: 'g-a2-wo-3',
        en: 'They would like to stay here.',
        correct: 'A ellos les gustaría quedarse aquí.',
        wrongs: ['Ellos les gustaría quedarse aquí.', 'A ellos le gustaría quedarme aquí.'],
        explain: 'Use <b>A ellos les gustaría + infinitivo</b> and match the reflexive pronoun <i>-se</i> to <i>ellos</i>.',
      },
      {
        id: 'g-a2-wo-4',
        en: 'I need to take a bath.',
        correct: 'Yo necesito bañarme.',
        wrongs: ['Yo necesito bañarse.', 'Yo necesito a bañarme.'],
        explain: 'Match the reflexive pronoun to the subject (<b>yo → -me</b>: <i>bañarme</i>), with no preposition after <i>necesitar</i>.',
      },
      {
        id: 'g-a2-wo-5',
        en: 'You (tú) have to get up early.',
        correct: 'Tú tienes que levantarte temprano.',
        wrongs: ['Tú tienes levantarte temprano.', 'Tú tienes que levantarse temprano.'],
        explain: '<b>Tener que + infinitivo</b> requires <i>que</i>, and <b>tú</b> takes <i>-te</i> (<i>levantarte</i>).',
      },
      {
        id: 'g-a2-wo-6',
        en: 'We are going to sit down here.',
        correct: 'Nosotros vamos a sentarnos aquí.',
        wrongs: ['Nosotros vamos sentarnos aquí.', 'Nosotros vamos a sentarse aquí.'],
        explain: '<b>Ir a + infinitivo</b> requires <i>a</i>, and <b>nosotros</b> takes <i>-nos</i> (<i>sentarnos</i>).',
      },
      {
        id: 'g-a2-wo-7',
        en: 'He does not eat meat or fish.',
        correct: 'Él no come carne ni pescado.',
        wrongs: ['Él no come carne o pescado.', 'Él no come carne y pescado.'],
        explain: 'After a negative verb (<i>no come</i>), use <b>ni</b> for “or / nor”.',
      },
      {
        id: 'g-a2-wo-8',
        en: 'I walk toward the station, but I do not go in.',
        correct: 'Camino hacia la estación, pero no entro.',
        wrongs: ['Camino hasta la estación, pero no entro.', 'Camino desde la estación, pero no entro.'],
        explain: '<b>Hacia</b> indicates direction (“toward”), while <i>hasta</i> marks the final endpoint.',
      },
      {
        id: 'g-a2-wo-9',
        en: 'According to the doctor, I should rest.',
        correct: 'Según el médico, debería descansar.',
        wrongs: ['Sin el médico, debería descansar.', 'Contra el médico, debería descansar.'],
        explain: '<b>Según</b> means “according to”.',
      },
      {
        id: 'g-a2-wo-10',
        en: 'I studied a lot; however, the exam was hard.',
        correct: 'Estudié mucho; sin embargo, el examen fue difícil.',
        wrongs: ['Estudié mucho; así que, el examen fue difícil.', 'Estudié mucho; durante, el examen fue difícil.'],
        explain: '<b>Sin embargo</b> expresses contrast (“however”); <i>así que</i> expresses result (“so/therefore”).',
      },
      {
        id: 'g-a2-wo-11',
        en: 'It was raining, so we stayed at home.',
        correct: 'Llovía, así que nos quedamos en casa.',
        wrongs: ['Llovía, aunque nos quedamos en casa.', 'Llovió, sin embargo nos quedamos en casa.'],
        explain: '<b>Así que</b> introduces a consequence (“so / therefore”).',
      },
      {
        id: 'g-a2-wo-12',
        en: 'They lived here for three years.',
        correct: 'Ellos vivieron aquí durante tres años.',
        wrongs: ['Ellos vivieron aquí desde tres años.', 'Ellos viven aquí hacia tres años.'],
        explain: '<b>Durante</b> expresses duration (“for three years”); <i>desde</i> marks a starting point.',
      },
      {
        id: 'g-a2-wo-13',
        en: 'Leave the keys on the table without making noise.',
        correct: 'Deja las llaves sobre la mesa sin hacer ruido.',
        wrongs: ['Deja las llaves sobre la mesa sin haciendo ruido.', 'Deja las llaves entre la mesa sin hago ruido.'],
        explain: 'After a preposition like <b>sin</b>, always use the <b>infinitive</b> (<i>sin hacer</i>).',
      },
      {
        id: 'g-a2-wo-14',
        en: 'On Monday we will go to the museum, and on Tuesday we will rest.',
        correct: 'El lunes iremos al museo y el martes descansaremos.',
        wrongs: ['El lunes fuimos al museo y el martes descansamos.', 'Ayer iremos al museo y mañana descansamos.'],
        explain: 'Future plans use the <b>futuro simple</b> (<i>iremos</i>, <i>descansaremos</i>) and <i>el + day of the week</i>.',
      },
      {
        id: 'g-a2-wo-15',
        en: 'Even though the station is far, we can walk there.',
        correct: 'Aunque la estación está lejos, podemos caminar hasta allí.',
        wrongs: ['Porque la estación está lejos, podemos caminar hasta allí.', 'Aunque la estación es lejos, podemos caminamos hasta allí.'],
        explain: '<b>Aunque + indicative</b> states a real concession (“even though”), and distance uses <b>estar lejos</b>.',
      },
      {
        id: 'g-a2-wo-16',
        en: 'While I was cooking, my brother set the table.',
        correct: 'Mientras yo cocinaba, mi hermano puso la mesa.',
        wrongs: ['Mientras yo cociné, mi hermano ponía la mesa.', 'Mientras yo cocinaba, mi hermano ponía la mesa ayer.'],
        explain: 'Use the <b>imperfecto</b> (<i>cocinaba</i>) for an ongoing background action and the <b>pretérito</b> (<i>puso</i>) for the completed action.',
      },
    ],
    B1: [
      {
        id: 'g-b1-wo-1',
        en: 'This restaurant is worth it.',
        correct: 'Este restaurante vale la pena.',
        wrongs: ['Este restaurante vale el dolor.', 'Este restaurante es valiendo la pena.'],
        explain: '<b>Valer la pena</b> is the fixed idiom for “to be worth it”.',
      },
      {
        id: 'g-b1-wo-2',
        en: 'I am worried that the appointment will be postponed.',
        correct: 'Me preocupa que la cita se posponga.',
        wrongs: ['Me preocupa que la cita se pospone.', 'Yo preocupo que la cita se posponga.'],
        explain: 'Emotion reactions like <b>me preocupa que</b> trigger the <b>subjunctive</b> (<i>posponga</i>).',
      },
      {
        id: 'g-b1-wo-3',
        en: 'He left so as not to arrive late to the meeting.',
        correct: 'Se fue para no llegar tarde a la reunión.',
        wrongs: ['Se fue por no llegar tarde a la reunión.', 'Se fue para no llegó tarde a la reunión.'],
        explain: 'Purpose with the same subject uses <b>para (no) + infinitivo</b>.',
      },
      {
        id: 'g-b1-wo-4',
        en: 'We will wait until he finishes his report.',
        correct: 'Esperaremos hasta que termine su informe.',
        wrongs: ['Esperaremos hasta que termina su informe.', 'Esperaremos hasta termine su informe.'],
        explain: 'Time conjunctions referring to a future event (<b>hasta que</b>, <i>cuando</i>, <i>en cuanto</i>) take the <b>subjunctive</b>.',
      },
      {
        id: 'g-b1-wo-5',
        en: 'It is important that everyone speaks Spanish.',
        correct: 'Es importante que todos hablen español.',
        wrongs: ['Es importante que todos hablan español.', 'Es importante todos hablen español.'],
        explain: 'Impersonal value judgments (<b>es importante que</b>) require the <b>subjunctive</b> (<i>hablen</i>).',
      },
      {
        id: 'g-b1-wo-6',
        en: 'If it had rained, we would have stayed inside.',
        correct: 'Si hubiera llovido, nos habríamos quedado dentro.',
        wrongs: ['Si habría llovido, nos habríamos quedado dentro.', 'Si lloviera, nos habríamos quedado dentro.'],
        explain: 'Past counterfactual uses <b>si + pluscuamperfecto de subjuntivo</b> (<i>hubiera llovido</i>) + <b>condicional compuesto</b> (<i>habríamos quedado</i>).',
      },
    ],
    B2: [
      {
        id: 'g-b2-wo-1',
        en: 'It is not that I do not want to, but that I cannot.',
        correct: 'No es que no quiera, sino que no puedo.',
        wrongs: ['No es que no quiero, pero que no puedo.', 'No es que no quiera, pero no pueda.'],
        explain: '<b>No es que + subjuntivo</b> denies the first reason, and <b>sino que + indicativo</b> states the real fact.',
      },
      {
        id: 'g-b2-wo-2',
        en: 'As soon as he arrived, he received the bad news.',
        correct: 'En cuanto llegó, recibió la mala noticia.',
        wrongs: ['En cuanto llegara, recibió la mala noticia.', 'En cuanto llegaba, recibía la mala noticia.'],
        explain: 'For a completed past event, <b>en cuanto</b> takes the <b>pretérito</b> (<i>llegó</i>).',
      },
      {
        id: 'g-b2-wo-3',
        en: 'It was so beautiful that I could not take my eyes off it.',
        correct: 'Era tan hermoso que no podía quitarle la vista.',
        wrongs: ['Era tanto hermoso que no podía quitarle la vista.', 'Era tan hermoso como no podía quitarle la vista.'],
        explain: 'Result clauses of degree use <b>tan + adjective + que</b>.',
      },
      {
        id: 'g-b2-wo-4',
        en: 'The fact that she accepted surprised everyone.',
        correct: 'El hecho de que aceptara sorprendió a todos.',
        wrongs: ['El hecho que aceptó sorprendió a todos.', 'El hecho de que aceptaba sorprendía a todos.'],
        explain: '<b>El hecho de que</b> (keep <i>de</i>!) regularly takes the <b>subjunctive</b> (<i>aceptara</i>).',
      },
    ],
  };

  Object.keys(WORD_ORDER_GRAMMAR_BY_LEVEL).forEach(lv => {
    if (!DATA[lv] || !Array.isArray(DATA[lv].grammar)) return;
    const seen = new Set(DATA[lv].grammar.map(g => normalize(g.correct)));
    WORD_ORDER_GRAMMAR_BY_LEVEL[lv].forEach(g => {
      if (!seen.has(normalize(g.correct))) {
        seen.add(normalize(g.correct));
        DATA[lv].grammar.push(g);
      }
    });
  });

  /* ============ Level Flashcards Bank (A1–B2 + EXAM): Verbs (Tenses & Combinations) + Nouns ============ */
  const EXTRA_LEVEL_VERBS = {
    A1: [
      { es: 'querer', en: 'to want' },
      { es: 'gustar', en: 'to like / be pleasing' },
      { es: 'ayudar', en: 'to help' },
      { es: 'aprender', en: 'to learn' },
      { es: 'ver', en: 'to see' },
    ],
  };

  const EXTRA_LEVEL_NOUNS = {
    A1: [
      { es: 'el baño', en: 'bathroom', cat: 'travel' },
      { es: 'el gato', en: 'cat', cat: 'family' },
      { es: 'el chocolate', en: 'chocolate', cat: 'food' },
      { es: 'la comida', en: 'food / meal', cat: 'food' },
      { es: 'la casa', en: 'house / home', cat: 'family' },
      { es: 'el inglés', en: 'English language', cat: 'culture' },
      { es: 'el español', en: 'Spanish language', cat: 'culture' },
    ],
    A2: [
      { es: 'la habitación', en: 'bedroom / room', cat: 'home' },
      { es: 'la ventana', en: 'window', cat: 'home' },
      { es: 'la puerta', en: 'door', cat: 'home' },
      { es: 'la mesa', en: 'table', cat: 'home' },
      { es: 'el cajón', en: 'drawer', cat: 'home' },
      { es: 'las llaves', en: 'keys', cat: 'home' },
      { es: 'el departamento', en: 'apartment', cat: 'home' },
      { es: 'el teléfono', en: 'telephone', cat: 'communication' },
      { es: 'la llamada', en: 'phone call', cat: 'communication' },
      { es: 'el mensaje', en: 'message', cat: 'communication' },
      { es: 'la dirección', en: 'address', cat: 'location' },
      { es: 'el número', en: 'number', cat: 'communication' },
      { es: 'el libro', en: 'book', cat: 'education' },
      { es: 'la tarea', en: 'homework / task', cat: 'education' },
      { es: 'la clase', en: 'class', cat: 'education' },
      { es: 'la palabra', en: 'word', cat: 'education' },
      { es: 'la película', en: 'movie', cat: 'culture' },
      { es: 'el museo', en: 'museum', cat: 'culture' },
      { es: 'la invitación', en: 'invitation', cat: 'culture' },
      { es: 'el boleto', en: 'ticket', cat: 'travel' },
      { es: 'la maleta', en: 'suitcase', cat: 'travel' },
      { es: 'la mochila', en: 'backpack', cat: 'travel' },
      { es: 'el taxi', en: 'taxi', cat: 'travel' },
      { es: 'el autobús', en: 'bus', cat: 'travel' },
      { es: 'el tren', en: 'train', cat: 'travel' },
      { es: 'el aeropuerto', en: 'airport', cat: 'travel' },
      { es: 'la estación', en: 'station', cat: 'travel' },
      { es: 'el hotel', en: 'hotel', cat: 'travel' },
      { es: 'el restaurante', en: 'restaurant', cat: 'food' },
      { es: 'el banco', en: 'bank', cat: 'money' },
      { es: 'la panadería', en: 'bakery', cat: 'food' },
      { es: 'la tienda', en: 'store / shop', cat: 'shopping' },
      { es: 'la plaza', en: 'town square / plaza', cat: 'location' },
      { es: 'el parque', en: 'park', cat: 'location' },
      { es: 'la camisa', en: 'shirt', cat: 'clothes' },
      { es: 'los platos', en: 'dishes / plates', cat: 'food' },
      { es: 'el vaso', en: 'drinking glass', cat: 'food' },
      { es: 'la cena', en: 'dinner', cat: 'food' },
      { es: 'el postre', en: 'dessert', cat: 'food' },
      { es: 'el café', en: 'coffee / café', cat: 'food' },
      { es: 'el té', en: 'tea', cat: 'food' },
      { es: 'el agua', en: 'water', cat: 'food' },
      { es: 'la pizza', en: 'pizza', cat: 'food' },
      { es: 'la carne', en: 'meat', cat: 'food' },
      { es: 'el pescado', en: 'fish', cat: 'food' },
      { es: 'los vecinos', en: 'neighbors', cat: 'family' },
      { es: 'los amigos', en: 'friends', cat: 'family' },
      { es: 'la familia', en: 'family', cat: 'family' },
      { es: 'la hermana', en: 'sister', cat: 'family' },
      { es: 'el hermano', en: 'brother', cat: 'family' },
      { es: 'la madre', en: 'mother', cat: 'family' },
      { es: 'el horario', en: 'schedule', cat: 'time' },
      { es: 'el ruido', en: 'noise', cat: 'home' },
    ],
  };

  // Full conjugation tables for common irregulars
  const FULL_CONJ = {
    ser: {
      present: { yo: 'soy', tu: 'eres', el: 'es', nosotros: 'somos', ellos: 'son' },
      preterite: { yo: 'fui', tu: 'fuiste', el: 'fue', nosotros: 'fuimos', ellos: 'fueron' },
      imperfect: { yo: 'era', tu: 'eras', el: 'era', nosotros: 'éramos', ellos: 'eran' },
      future: { yo: 'seré', tu: 'serás', el: 'será', nosotros: 'seremos', ellos: 'serán' },
      conditional: { yo: 'sería', tu: 'serías', el: 'sería', nosotros: 'seríamos', ellos: 'serían' },
    },
    estar: {
      present: { yo: 'estoy', tu: 'estás', el: 'está', nosotros: 'estamos', ellos: 'están' },
      preterite: { yo: 'estuve', tu: 'estuviste', el: 'estuvo', nosotros: 'estuvimos', ellos: 'estuvieron' },
      imperfect: { yo: 'estaba', tu: 'estabas', el: 'estaba', nosotros: 'estábamos', ellos: 'estaban' },
      future: { yo: 'estaré', tu: 'estarás', el: 'estará', nosotros: 'estaremos', ellos: 'estarán' },
      conditional: { yo: 'estaría', tu: 'estarías', el: 'estaría', nosotros: 'estaríamos', ellos: 'estarían' },
    },
    ir: {
      present: { yo: 'voy', tu: 'vas', el: 'va', nosotros: 'vamos', ellos: 'van' },
      preterite: { yo: 'fui', tu: 'fuiste', el: 'fue', nosotros: 'fuimos', ellos: 'fueron' },
      imperfect: { yo: 'iba', tu: 'ibas', el: 'iba', nosotros: 'íbamos', ellos: 'iban' },
      future: { yo: 'iré', tu: 'irás', el: 'irá', nosotros: 'iremos', ellos: 'irán' },
      conditional: { yo: 'iría', tu: 'irías', el: 'iría', nosotros: 'iríamos', ellos: 'irían' },
    },
    tener: {
      present: { yo: 'tengo', tu: 'tienes', el: 'tiene', nosotros: 'tenemos', ellos: 'tienen' },
      preterite: { yo: 'tuve', tu: 'tuviste', el: 'tuvo', nosotros: 'tuvimos', ellos: 'tuvieron' },
      imperfect: { yo: 'tenía', tu: 'tenías', el: 'tenía', nosotros: 'teníamos', ellos: 'tenían' },
      future: { yo: 'tendré', tu: 'tendrás', el: 'tendrá', nosotros: 'tendremos', ellos: 'tendrán' },
      conditional: { yo: 'tendría', tu: 'tendrías', el: 'tendría', nosotros: 'tendríamos', ellos: 'tendrían' },
    },
    hacer: {
      present: { yo: 'hago', tu: 'haces', el: 'hace', nosotros: 'hacemos', ellos: 'hacen' },
      preterite: { yo: 'hice', tu: 'hiciste', el: 'hizo', nosotros: 'hicimos', ellos: 'hicieron' },
      imperfect: { yo: 'hacía', tu: 'hacías', el: 'hacía', nosotros: 'hacíamos', ellos: 'hacían' },
      future: { yo: 'haré', tu: 'harás', el: 'hará', nosotros: 'haremos', ellos: 'harán' },
      conditional: { yo: 'haría', tu: 'harías', el: 'haría', nosotros: 'haríamos', ellos: 'harían' },
    },
    poder: {
      present: { yo: 'puedo', tu: 'puedes', el: 'puede', nosotros: 'podemos', ellos: 'pueden' },
      preterite: { yo: 'pude', tu: 'pudiste', el: 'pudo', nosotros: 'pudimos', ellos: 'pudieron' },
      imperfect: { yo: 'podía', tu: 'podías', el: 'podía', nosotros: 'podíamos', ellos: 'podían' },
      future: { yo: 'podré', tu: 'podrás', el: 'podrá', nosotros: 'podremos', ellos: 'podrán' },
      conditional: { yo: 'podría', tu: 'podrías', el: 'podría', nosotros: 'podríamos', ellos: 'podrían' },
    },
    querer: {
      present: { yo: 'quiero', tu: 'quieres', el: 'quiere', nosotros: 'queremos', ellos: 'quieren' },
      preterite: { yo: 'quise', tu: 'quisiste', el: 'quiso', nosotros: 'quisimos', ellos: 'quisieron' },
      imperfect: { yo: 'quería', tu: 'querías', el: 'quería', nosotros: 'queríamos', ellos: 'querían' },
      future: { yo: 'querré', tu: 'querrás', el: 'querrá', nosotros: 'querremos', ellos: 'querrán' },
      conditional: { yo: 'querría', tu: 'querrías', el: 'querría', nosotros: 'querríamos', ellos: 'querrían' },
    },
    venir: {
      present: { yo: 'vengo', tu: 'vienes', el: 'viene', nosotros: 'venimos', ellos: 'vienen' },
      preterite: { yo: 'vine', tu: 'viniste', el: 'vino', nosotros: 'vinimos', ellos: 'vinieron' },
      imperfect: { yo: 'venía', tu: 'venías', el: 'venía', nosotros: 'veníamos', ellos: 'venían' },
      future: { yo: 'vendré', tu: 'vendrás', el: 'vendrá', nosotros: 'vendremos', ellos: 'vendrán' },
      conditional: { yo: 'vendría', tu: 'vendrías', el: 'vendría', nosotros: 'vendríamos', ellos: 'vendrían' },
    },
    poner: {
      present: { yo: 'pongo', tu: 'pones', el: 'pone', nosotros: 'ponemos', ellos: 'ponen' },
      preterite: { yo: 'puse', tu: 'pusiste', el: 'puso', nosotros: 'pusimos', ellos: 'pusieron' },
      imperfect: { yo: 'ponía', tu: 'ponías', el: 'ponía', nosotros: 'poníamos', ellos: 'ponían' },
      future: { yo: 'pondré', tu: 'pondrás', el: 'pondrá', nosotros: 'pondremos', ellos: 'pondrán' },
      conditional: { yo: 'pondría', tu: 'pondrías', el: 'pondría', nosotros: 'pondríamos', ellos: 'pondrían' },
    },
    decir: {
      present: { yo: 'digo', tu: 'dices', el: 'dice', nosotros: 'decimos', ellos: 'dicen' },
      preterite: { yo: 'dije', tu: 'dijiste', el: 'dijo', nosotros: 'dijimos', ellos: 'dijeron' },
      imperfect: { yo: 'decía', tu: 'decías', el: 'decía', nosotros: 'decíamos', ellos: 'decían' },
      future: { yo: 'diré', tu: 'dirás', el: 'dirá', nosotros: 'diremos', ellos: 'dirán' },
      conditional: { yo: 'diría', tu: 'dirías', el: 'diría', nosotros: 'diríamos', ellos: 'dirían' },
    },
    traer: {
      present: { yo: 'traigo', tu: 'traes', el: 'trae', nosotros: 'traemos', ellos: 'traen' },
      preterite: { yo: 'traje', tu: 'trajiste', el: 'trajo', nosotros: 'trajimos', ellos: 'trajeron' },
      imperfect: { yo: 'traía', tu: 'traías', el: 'traía', nosotros: 'traíamos', ellos: 'traían' },
      future: { yo: 'traeré', tu: 'traerás', el: 'traerá', nosotros: 'traeremos', ellos: 'traerán' },
      conditional: { yo: 'traería', tu: 'traerías', el: 'traería', nosotros: 'traeríamos', ellos: 'traerían' },
    },
    saber: {
      present: { yo: 'sé', tu: 'sabes', el: 'sabe', nosotros: 'sabemos', ellos: 'saben' },
      preterite: { yo: 'supe', tu: 'supiste', el: 'supo', nosotros: 'supimos', ellos: 'supieron' },
      imperfect: { yo: 'sabía', tu: 'sabías', el: 'sabía', nosotros: 'sabíamos', ellos: 'sabían' },
      future: { yo: 'sabré', tu: 'sabrás', el: 'sabrá', nosotros: 'sabremos', ellos: 'sabrán' },
      conditional: { yo: 'sabría', tu: 'sabrías', el: 'sabría', nosotros: 'sabríamos', ellos: 'sabrían' },
    },
    salir: {
      present: { yo: 'salgo', tu: 'sales', el: 'sale', nosotros: 'salimos', ellos: 'salen' },
      preterite: { yo: 'salí', tu: 'saliste', el: 'salió', nosotros: 'salimos', ellos: 'salieron' },
      imperfect: { yo: 'salía', tu: 'salías', el: 'salía', nosotros: 'salíamos', ellos: 'salían' },
      future: { yo: 'saldré', tu: 'saldrás', el: 'saldrá', nosotros: 'saldremos', ellos: 'saldrán' },
      conditional: { yo: 'saldría', tu: 'saldrías', el: 'saldría', nosotros: 'saldríamos', ellos: 'saldrían' },
    },
    dar: {
      present: { yo: 'doy', tu: 'das', el: 'da', nosotros: 'damos', ellos: 'dan' },
      preterite: { yo: 'di', tu: 'diste', el: 'dio', nosotros: 'dimos', ellos: 'dieron' },
      imperfect: { yo: 'daba', tu: 'dabas', el: 'daba', nosotros: 'dábamos', ellos: 'daban' },
      future: { yo: 'daré', tu: 'darás', el: 'dará', nosotros: 'daremos', ellos: 'darán' },
      conditional: { yo: 'daría', tu: 'darías', el: 'daría', nosotros: 'daríamos', ellos: 'darían' },
    },
    ver: {
      present: { yo: 'veo', tu: 'ves', el: 've', nosotros: 'vemos', ellos: 'ven' },
      preterite: { yo: 'vi', tu: 'viste', el: 'vio', nosotros: 'vimos', ellos: 'vieron' },
      imperfect: { yo: 'veía', tu: 'veías', el: 'veía', nosotros: 'veíamos', ellos: 'veían' },
      future: { yo: 'veré', tu: 'verás', el: 'verá', nosotros: 'veremos', ellos: 'verán' },
      conditional: { yo: 'vería', tu: 'verías', el: 'vería', nosotros: 'veríamos', ellos: 'verían' },
    },
  };

  function conjugateVerbAllTenses(rawEs) {
    const parts = String(rawEs || '').trim().split(/\s+/);
    const head = parts[0];
    const tail = parts.slice(1).join(' ');
    const sfx = tail ? ' ' + tail : '';
    const isRefl = head.endsWith('se');
    const base = isRefl ? head.slice(0, -2) : head;
    const stem = base.slice(0, -2);
    const ending = base.slice(-2);

    let raw = FULL_CONJ[base];
    if (!raw) {
      let yoPres = stem + 'o';
      if (base.endsWith('cer') || base.endsWith('cir')) yoPres = base.slice(0, -3) + 'zco';
      else if (base.endsWith('ger') || base.endsWith('gir')) yoPres = stem.slice(0, -1) + 'jo';
      let yoPret = ending === 'ar' ? stem + 'é' : stem + 'í';
      if (base.endsWith('car')) yoPret = base.slice(0, -3) + 'qué';
      else if (base.endsWith('gar')) yoPret = base.slice(0, -3) + 'gué';
      else if (base.endsWith('zar')) yoPret = base.slice(0, -3) + 'cé';

      const isAr = ending === 'ar';
      const isEr = ending === 'er';
      raw = {
        present: {
          yo: yoPres,
          tu: stem + (isAr ? 'as' : 'es'),
          el: stem + (isAr ? 'a' : 'e'),
          nosotros: stem + (isAr ? 'amos' : (isEr ? 'emos' : 'imos')),
          ellos: stem + (isAr ? 'an' : 'en'),
        },
        preterite: {
          yo: yoPret,
          tu: stem + (isAr ? 'aste' : 'iste'),
          el: stem + (isAr ? 'ó' : 'ió'),
          nosotros: stem + (isAr ? 'amos' : 'imos'),
          ellos: stem + (isAr ? 'aron' : 'ieron'),
        },
        imperfect: {
          yo: stem + (isAr ? 'aba' : 'ía'),
          tu: stem + (isAr ? 'abas' : 'ías'),
          el: stem + (isAr ? 'aba' : 'ía'),
          nosotros: stem + (isAr ? 'ábamos' : 'íamos'),
          ellos: stem + (isAr ? 'aban' : 'ían'),
        },
        future: {
          yo: base + 'é',
          tu: base + 'ás',
          el: base + 'á',
          nosotros: base + 'emos',
          ellos: base + 'án',
        },
        conditional: {
          yo: base + 'ía',
          tu: base + 'ías',
          el: base + 'ía',
          nosotros: base + 'íamos',
          ellos: base + 'ían',
        },
      };
    }

    const reflMap = { yo: 'me ', tu: 'te ', el: 'se ', nosotros: 'nos ', ellos: 'se ' };
    const attachTense = t => ({
      yo: (isRefl ? reflMap.yo : '') + t.yo + sfx,
      tu: (isRefl ? reflMap.tu : '') + t.tu + sfx,
      el: (isRefl ? reflMap.el : '') + t.el + sfx,
      nosotros: (isRefl ? reflMap.nosotros : '') + t.nosotros + sfx,
      ellos: (isRefl ? reflMap.ellos : '') + t.ellos + sfx,
    });

    const infFor = clitic => (isRefl ? base + clitic : base) + sfx;
    return {
      present: attachTense(raw.present),
      preterite: attachTense(raw.preterite),
      imperfect: attachTense(raw.imperfect),
      future: attachTense(raw.future),
      conditional: attachTense(raw.conditional),
      inf: {
        yo: infFor('me'),
        tu: infFor('te'),
        el: infFor('se'),
        nosotros: infFor('nos'),
        ellos: infFor('se'),
      },
    };
  }

  function collectLevelVerbs(level) {
    const d = DATA[level];
    if (!d) return [];
    const map = new Map();
    (d.verbs || []).forEach(v => map.set(v.es, { es: v.es, en: v.en }));
    (d.words || []).filter(w => w.cat === 'verbs').forEach(w => {
      if (!map.has(w.es)) map.set(w.es, { es: w.es, en: w.en });
    });
    (EXTRA_LEVEL_VERBS[level] || []).forEach(v => {
      if (!map.has(v.es)) map.set(v.es, { es: v.es, en: v.en });
    });
    return Array.from(map.values());
  }

  const NOUN_CATS = new Set([
    'food', 'family', 'travel', 'time', 'money', 'work', 'health', 'planning', 'culture',
    'home', 'communication', 'environment', 'education', 'leisure', 'clothes', 'body',
    'weather', 'chores', 'appearance', 'personality', 'city', 'shopping', 'nature', 'daily',
    'society', 'psychology', 'economy', 'medicine', 'legal', 'errands', 'abstract', 'feelings',
    'personas', 'fechas', 'lugares', 'comida', 'civica', 'conceptos',
  ]);

  function collectLevelNouns(level, verbSet) {
    const d = DATA[level];
    if (!d) return [];
    const map = new Map();
    (d.words || []).forEach(w => {
      if (w.cat === 'verbs' || w.cat === 'verb frames' || verbSet.has(w.es)) return;
      const isArticleNoun = /^(el|la|los|las|un|una)\s+/i.test(w.es);
      if (isArticleNoun || NOUN_CATS.has(w.cat)) {
        map.set(w.es, { es: w.es, en: w.en, cat: w.cat || 'vocabulary' });
      }
    });
    (EXTRA_LEVEL_NOUNS[level] || []).forEach(n => {
      if (!map.has(n.es) && !verbSet.has(n.es)) map.set(n.es, n);
    });
    return Array.from(map.values());
  }

  function genderLabelForNoun(es) {
    const s = String(es || '').trim().toLowerCase();
    if (s.startsWith('el ') || s.startsWith('un ')) return 'Masculine singular (el)';
    if (s.startsWith('la ') || s.startsWith('una ')) return 'Feminine singular (la)';
    if (s.startsWith('los ')) return 'Masculine plural (los)';
    if (s.startsWith('las ')) return 'Feminine plural (las)';
    return 'Level vocabulary / expression';
  }

  function buildFlashcardBank(level) {
    const verbs = collectLevelVerbs(level);
    const verbSet = new Set(verbs.map(v => v.es));
    const nouns = collectLevelNouns(level, verbSet);
    const cards = [];
    const subjKeys = ['yo', 'tu', 'el', 'nosotros', 'ellos'];
    const subjLabels = {
      yo: { es: 'Yo', en: 'I' },
      tu: { es: 'Tú', en: 'You (tú)' },
      el: { es: 'Él/Ella', en: 'He/She' },
      nosotros: { es: 'Nosotros', en: 'We' },
      ellos: { es: 'Ellos/Ustedes', en: 'They / You all' },
    };

    verbs.forEach((verb, idx) => {
      const gloss = englishGloss(verb.en);
      const conj = conjugateVerbAllTenses(verb.es);
      const sk1 = subjKeys[idx % subjKeys.length];
      const sk2 = subjKeys[(idx + 1) % subjKeys.length];
      const sk3 = subjKeys[(idx + 2) % subjKeys.length];
      const sk4 = subjKeys[(idx + 3) % subjKeys.length];
      const sk5 = subjKeys[(idx + 4) % subjKeys.length];

      const formsTable = {
        infinitive: `${verb.es} — ${verb.en}`,
        presente: `Yo ${conj.present.yo} · Tú ${conj.present.tu} · Él ${conj.present.el} · Nosotros ${conj.present.nosotros} · Ellos ${conj.present.ellos}`,
        preterito: `Yo ${conj.preterite.yo} · Tú ${conj.preterite.tu} · Él ${conj.preterite.el} · Nosotros ${conj.preterite.nosotros} · Ellos ${conj.preterite.ellos}`,
        imperfecto: `Yo ${conj.imperfect.yo} · Tú ${conj.imperfect.tu} · Él ${conj.imperfect.el} · Nosotros ${conj.imperfect.nosotros} · Ellos ${conj.imperfect.ellos}`,
        futuro: `Yo ${conj.future.yo} · Tú ${conj.future.tu} · Él ${conj.future.el} · Nosotros ${conj.future.nosotros} · Ellos ${conj.future.ellos}`,
        condicional: `Yo ${conj.conditional.yo} · Él ${conj.conditional.el} · Nosotros ${conj.conditional.nosotros} · Ellos ${conj.conditional.ellos}`,
        combinaciones: `Tengo que ${conj.inf.yo} · Voy a ${conj.inf.yo} · Puedo ${conj.inf.yo} · Acabo de ${conj.inf.yo} · Debería ${conj.inf.yo} · Me gustaría ${conj.inf.yo}`,
      };

      // 1. Presente card
      const presRight = `${subjLabels[sk1].es} ${conj.present[sk1]}`;
      cards.push({
        id: `${level}-fc-v-${slug(verb.es)}-presente`,
        cardType: 'verb',
        subType: 'presente',
        badge: 'Verb · Presente',
        verbEs: verb.es,
        verbEn: verb.en,
        prompt: `${subjLabels[sk1].en} — ${verb.en} (Presente)`,
        es: presRight,
        en: `${subjLabels[sk1].en} (${gloss}) — Present tense`,
        wrongs: [
          `${subjLabels[sk1].es} ${conj.preterite[sk1]}`,
          `${subjLabels[sk1].es} ${conj.imperfect[sk1]}`,
          `${subjLabels[sk2].es} ${conj.present[sk2]}`,
        ],
        formsTable,
      });

      // 2. Pretérito (Completed Past) card
      const pretRight = `Ayer ${subjLabels[sk2].es.toLowerCase()} ${conj.preterite[sk2]}`;
      cards.push({
        id: `${level}-fc-v-${slug(verb.es)}-preterito`,
        cardType: 'verb',
        subType: 'pasado',
        badge: 'Verb · Pretérito (Past)',
        verbEs: verb.es,
        verbEn: verb.en,
        prompt: `Yesterday · ${subjLabels[sk2].en} — ${verb.en} (Pretérito)`,
        es: pretRight,
        en: `Yesterday ${subjLabels[sk2].en.toLowerCase()} (${gloss}) — Completed past`,
        wrongs: [
          `Ayer ${subjLabels[sk2].es.toLowerCase()} ${conj.present[sk2]}`,
          `Ayer ${subjLabels[sk2].es.toLowerCase()} ${conj.imperfect[sk2]}`,
          `Mañana ${subjLabels[sk2].es.toLowerCase()} ${conj.future[sk2]}`,
        ],
        formsTable,
      });

      // 3. Imperfecto (Ongoing / Habitual Past) card
      const impRight = `Antes ${subjLabels[sk3].es.toLowerCase()} ${conj.imperfect[sk3]}`;
      cards.push({
        id: `${level}-fc-v-${slug(verb.es)}-imperfecto`,
        cardType: 'verb',
        subType: 'pasado',
        badge: 'Verb · Imperfecto (Past Habit)',
        verbEs: verb.es,
        verbEn: verb.en,
        prompt: `Used to / Was doing · ${subjLabels[sk3].en} — ${verb.en} (Imperfecto)`,
        es: impRight,
        en: `${subjLabels[sk3].en} used to (${gloss}) — Imperfect past`,
        wrongs: [
          `Antes ${subjLabels[sk3].es.toLowerCase()} ${conj.preterite[sk3]}`,
          `Antes ${subjLabels[sk3].es.toLowerCase()} ${conj.present[sk3]}`,
          `Antes ${subjLabels[sk3].es.toLowerCase()} ${conj.future[sk3]}`,
        ],
        formsTable,
      });

      // 4. Futuro & Condicional card
      const futRight = `Mañana ${subjLabels[sk4].es.toLowerCase()} ${conj.future[sk4]} · ${conj.conditional[sk4]}`;
      cards.push({
        id: `${level}-fc-v-${slug(verb.es)}-futuro`,
        cardType: 'verb',
        subType: 'futuro',
        badge: 'Verb · Futuro & Condicional',
        verbEs: verb.es,
        verbEn: verb.en,
        prompt: `Will / Would · ${subjLabels[sk4].en} — ${verb.en} (Futuro & Condicional)`,
        es: futRight,
        en: `${subjLabels[sk4].en} will / would (${gloss})`,
        wrongs: [
          `Mañana ${subjLabels[sk4].es.toLowerCase()} ${conj.present[sk4]} · ${conj.preterite[sk4]}`,
          `Mañana ${subjLabels[sk4].es.toLowerCase()} ${conj.imperfect[sk4]} · ${conj.present[sk4]}`,
          `Ayer ${subjLabels[sk4].es.toLowerCase()} ${conj.preterite[sk4]} · ${conj.imperfect[sk4]}`,
        ],
        formsTable,
      });

      // 5. Verb Combinations card (tener que / ir a / poder / acabar de / debería / me gustaría)
      const comboTemplates = [
        {
          label: 'tener que + infinitivo',
          es: `${subjLabels[sk5].es} ${{ yo: 'tengo que', tu: 'tienes que', el: 'tiene que', nosotros: 'tenemos que', ellos: 'tienen que' }[sk5]} ${conj.inf[sk5]}`,
          en: `${subjLabels[sk5].en} have/has to ${gloss}`,
          w1: `${subjLabels[sk5].es} ${{ yo: 'tengo', tu: 'tienes', el: 'tiene', nosotros: 'tenemos', ellos: 'tienen' }[sk5]} ${conj.present[sk5]}`,
          w2: `${subjLabels[sk5].es} ${{ yo: 'voy a', tu: 'vas a', el: 'va a', nosotros: 'vamos a', ellos: 'van a' }[sk5]} ${conj.preterite[sk5]}`,
          w3: `${subjLabels[sk5].es} ${{ yo: 'acabo', tu: 'acabas', el: 'acaba', nosotros: 'acabamos', ellos: 'acaban' }[sk5]} ${conj.inf[sk5]}`,
        },
        {
          label: 'ir a + infinitivo',
          es: `${subjLabels[sk5].es} ${{ yo: 'voy a', tu: 'vas a', el: 'va a', nosotros: 'vamos a', ellos: 'van a' }[sk5]} ${conj.inf[sk5]}`,
          en: `${subjLabels[sk5].en} am/is/are going to ${gloss}`,
          w1: `${subjLabels[sk5].es} ${{ yo: 'voy', tu: 'vas', el: 'va', nosotros: 'vamos', ellos: 'van' }[sk5]} ${conj.present[sk5]}`,
          w2: `${subjLabels[sk5].es} ${{ yo: 'fui a', tu: 'fuiste a', el: 'fue a', nosotros: 'fuimos a', ellos: 'fueron a' }[sk5]} ${conj.preterite[sk5]}`,
          w3: `${subjLabels[sk5].es} ${{ yo: 'tengo a', tu: 'tienes a', el: 'tiene a', nosotros: 'tenemos a', ellos: 'tienen a' }[sk5]} ${conj.inf[sk5]}`,
        },
        {
          label: 'acabar de + infinitivo',
          es: `${subjLabels[sk5].es} ${{ yo: 'acabo de', tu: 'acabas de', el: 'acaba de', nosotros: 'acabamos de', ellos: 'acaban de' }[sk5]} ${conj.inf[sk5]}`,
          en: `${subjLabels[sk5].en} have/has just (${gloss})`,
          w1: `${subjLabels[sk5].es} ${{ yo: 'acabo a', tu: 'acabas a', el: 'acaba a', nosotros: 'acabamos a', ellos: 'acaban a' }[sk5]} ${conj.inf[sk5]}`,
          w2: `${subjLabels[sk5].es} ${{ yo: 'acabo de', tu: 'acabas de', el: 'acaba de', nosotros: 'acabamos de', ellos: 'acaban de' }[sk5]} ${conj.preterite[sk5]}`,
          w3: `${subjLabels[sk5].es} ${{ yo: 'suelo de', tu: 'sueles de', el: 'suele de', nosotros: 'solemos de', ellos: 'suelen de' }[sk5]} ${conj.inf[sk5]}`,
        },
        {
          label: 'debería / podría + infinitivo',
          es: `${subjLabels[sk5].es} ${{ yo: 'debería', tu: 'deberías', el: 'debería', nosotros: 'deberíamos', ellos: 'deberían' }[sk5]} ${conj.inf[sk5]}`,
          en: `${subjLabels[sk5].en} should ${gloss}`,
          w1: `${subjLabels[sk5].es} ${{ yo: 'debería a', tu: 'deberías a', el: 'debería a', nosotros: 'deberíamos a', ellos: 'deberían a' }[sk5]} ${conj.inf[sk5]}`,
          w2: `${subjLabels[sk5].es} ${{ yo: 'debería', tu: 'deberías', el: 'debería', nosotros: 'deberíamos', ellos: 'deberían' }[sk5]} ${conj.present[sk5]}`,
          w3: `${subjLabels[sk5].es} ${{ yo: 'podría que', tu: 'podrías que', el: 'podría que', nosotros: 'podríamos que', ellos: 'podrían que' }[sk5]} ${conj.inf[sk5]}`,
        },
      ];
      const combo = comboTemplates[idx % comboTemplates.length];
      cards.push({
        id: `${level}-fc-v-${slug(verb.es)}-combo`,
        cardType: 'verb',
        subType: 'combinaciones',
        badge: `Verb · Combination (${combo.label})`,
        verbEs: verb.es,
        verbEn: verb.en,
        prompt: `${combo.en} — (${combo.label})`,
        es: combo.es,
        en: combo.en,
        wrongs: [combo.w1, combo.w2, combo.w3],
        formsTable,
      });
    });

    // Noun cards for every noun in the level
    nouns.forEach((noun, idx) => {
      const sameCat = nouns.filter(n => n.es !== noun.es && n.cat === noun.cat);
      const otherNouns = sameCat.length >= 3 ? sameCat : nouns.filter(n => n.es !== noun.es);
      const wrongs = [];
      for (let i = 0; i < otherNouns.length && wrongs.length < 3; i++) {
        const cand = otherNouns[(idx * 5 + i * 3 + 1) % otherNouns.length].es;
        if (!wrongs.includes(cand) && normalize(cand) !== normalize(noun.es)) wrongs.push(cand);
      }
      const pairedVerb = verbs.length ? verbs[idx % verbs.length] : { es: 'necesitar', en: 'to need' };
      cards.push({
        id: `${level}-fc-n-${slug(noun.es)}`,
        cardType: 'noun',
        subType: 'noun',
        cat: noun.cat || 'noun',
        badge: `Noun · ${noun.cat || 'vocabulary'}`,
        prompt: `${noun.en} (${noun.cat || 'noun'})`,
        es: noun.es,
        en: noun.en,
        genderInfo: genderLabelForNoun(noun.es),
        comboExample: `Necesito ${noun.es} · Tengo ${noun.es} · Hablo de ${noun.es} (paired verb: ${pairedVerb.es})`,
        wrongs,
      });
    });

    return cards;
  }

  DATA.levels.forEach(level => {
    if (!DATA[level]) return;
    DATA[level].flashcards = buildFlashcardBank(level);
  });

  // Lets future B1/B2 additions use the same schema and mastery behavior.
  window.buildVerbSentenceBank = buildVerbSentenceBank;
  window.buildFlashcardBank = buildFlashcardBank;
})();
