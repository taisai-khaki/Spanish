'use strict';
/* ============ 200-verb deck: handout verbs × magic frames × glue words ============
   Built from the two numbered handout lists (100 + 100 verbs → 190 unique
   lemmas, 10 repeats) plus the 11 magic-verb frames and the 214 glue-word cards.

   Card groups (every card exists in both directions, ES→EN and EN→ES):
     · magic     — 190 verbs × 11 frames (first person)   = 2,090 per direction
     · regular   — 107 verbs × 3 (infinitive, yo presente,
                   yo pretérito)                          =   321 per direction
     · irregular —  83 verbs × 11 (infinitive + 5 presente
                   + 5 pretérito person forms)            =   913 per direction
     · glue      — 214 glue words                         =   214 per direction
                                                            ----------------
                                                            3,538 per direction
                                                            7,076 cards total

   The conjugation engine below is self-contained (conjugation happens before
   core.js is loaded) and covers presente + pretérito for all five persons,
   including stem changes (e→ie, o→ue, e→i, u→ue), irregular yo forms, strong
   preterites, spelling changes (llegué / busqué / pagué / crucé…), the
   accent-shifting verbs (continúo, guío), -eer/-aer/-oír (-yó) verbs and
   reflexive pronoun placement.

   Pretérito forms for handout rows 1–100 are regression-tested against the
   author's own answer key in test/fixtures/trainer-pret-100.json. */
(function () {
  /* ---------------- the 200 handout rows (1–100 + 101–200) ---------------- */
  const ROWS = [
    { n: 1, es: 'contestar', en: 'to answer', ending: 'the phone el teléfono' },
    { n: 2, es: 'llegar', en: 'to arrive', ending: 'at the airport al aeropuerto' },
    { n: 3, es: 'preguntar', en: 'to ask', ending: 'something algo' },
    { n: 4, es: 'pedir', en: 'to ask for', ending: 'the bill la cuenta' },
    { n: 5, es: 'ser', en: 'to be (permanent)', ending: 'a doctor un doctor' },
    { n: 6, es: 'estar', en: 'to be (temporary)', ending: 'happy feliz' },
    { n: 7, es: 'poder', en: 'to be able', ending: 'to run correr' },
    { n: 8, es: 'comenzar', en: 'to begin', ending: 'the lesson la lección' },
    { n: 9, es: 'creer', en: 'to believe', ending: 'the story la historia' },
    { n: 10, es: 'traer', en: 'to bring', ending: 'the bag la bolsa' },
    { n: 11, es: 'comprar', en: 'to buy', ending: 'a shirt una camisa' },
    { n: 12, es: 'llamar', en: 'to call', ending: 'the person a la persona' },
    { n: 13, es: 'llevar', en: 'to carry', ending: 'the backpack la mochila' },
    { n: 14, es: 'cambiar', en: 'to change', ending: 'the tire la llanta' },
    { n: 15, es: 'limpiar', en: 'to clean', ending: 'the room la habitación' },
    { n: 16, es: 'cerrar', en: 'to close', ending: 'the door la puerta' },
    { n: 17, es: 'venir', en: 'to come', ending: 'the supermarket al supermercado' },
    { n: 18, es: 'comprender', en: 'to comprehend', ending: 'the lesson la lección' },
    { n: 19, es: 'continuar', en: 'to continue', ending: 'down the street por la calle' },
    { n: 20, es: 'cocinar', en: 'to cook', ending: 'the eggs los huevos' },
    { n: 21, es: 'contar', en: 'to count', ending: 'the money el dinero' },
    { n: 22, es: 'bailar', en: 'to dance', ending: 'at the party en la fiesta' },
    { n: 23, es: 'hacer', en: 'to do', ending: 'homework la tarea' },
    { n: 24, es: 'beber', en: 'to drink (formal)', ending: 'the water el agua' },
    { n: 25, es: 'tomar', en: 'to drink (casual)', ending: 'the wine el vino' },
    { n: 26, es: 'manejar', en: 'to drive', ending: 'to the store a la tienda' },
    { n: 27, es: 'ganar', en: 'to earn', ending: 'a salary un sueldo' },
    { n: 28, es: 'comer', en: 'to eat', ending: 'fruit fruta' },
    { n: 29, es: 'desayunar', en: 'to eat breakfast', ending: 'with the people con las personas' },
    { n: 30, es: 'cenar', en: 'to eat dinner', ending: 'with the family con la familia' },
    { n: 31, es: 'almorzar', en: 'to eat lunch', ending: 'at 2pm a las 2pm' },
    { n: 32, es: 'disfrutar', en: 'to enjoy', ending: 'the vacation las vacaciones' },
    { n: 33, es: 'entrar', en: 'to enter', ending: 'the room en la habitación' },
    { n: 34, es: 'encontrar', en: 'to find', ending: 'the notebooks los cuadernos' },
    { n: 35, es: 'terminar', en: 'to finish', ending: 'the book el libro' },
    { n: 36, es: 'olvidar', en: 'to forget', ending: 'the keys las llaves' },
    { n: 37, es: 'conseguir', en: 'to get', ending: 'a book un libro' },
    { n: 38, es: 'dar', en: 'to give', ending: 'a gift un regalo' },
    { n: 39, es: 'ir', en: 'to go', ending: 'to the movies al cine' },
    { n: 40, es: 'bajar', en: 'to go down', ending: 'the stairs las escaleras' },
    { n: 41, es: 'subir', en: 'to go up', ending: 'the elevator por el ascensor' },
    { n: 42, es: 'odiar', en: 'to hate', ending: 'the homework la tarea' },
    { n: 43, es: 'tener', en: 'to have', ending: 'a pet una mascota' },
    { n: 44, es: 'oír', en: 'to hear', ending: 'a noise un ruido' },
    { n: 45, es: 'ayudar', en: 'to help', ending: 'the neighbor al vecino' },
    { n: 46, es: 'esperar', en: 'to hope (for)', ending: 'a miracle un milagro' },
    { n: 47, es: 'abrazar', en: 'to hug', ending: 'the children a los hijos' },
    { n: 48, es: 'besar', en: 'to kiss', ending: 'the person a la persona' },
    { n: 49, es: 'saber', en: 'to know (a fact)', ending: 'the address la dirección' },
    { n: 50, es: 'conocer', en: 'to know (personally)', ending: 'the neighbor al vecino' },
    { n: 51, es: 'aprender', en: 'to learn', ending: 'spanish español' },
    { n: 52, es: 'salir', en: 'to leave (from)', ending: '(de) from the place del lugar' },
    { n: 53, es: 'escuchar', en: 'to listen (to)', ending: 'music música' },
    { n: 54, es: 'vivir', en: 'to live', ending: 'in Paris en Paris' },
    { n: 55, es: 'mirar', en: 'to look (at)', ending: 'the stars las estrellas' },
    { n: 56, es: 'buscar', en: 'to look for', ending: 'the keys las llaves' },
    { n: 57, es: 'perder', en: 'to lose', ending: 'the wallet la cartera' },
    { n: 58, es: 'amar', en: 'to love', ending: 'the people a las personas' },
    { n: 59, es: 'hacer', en: 'to make', ending: 'the coffee el café' },
    { n: 60, es: 'conocer', en: 'to meet (someone)', ending: 'the in-laws a los suegros' },
    { n: 61, es: 'necesitar', en: 'to need', ending: 'a cell phone un celular' },
    { n: 62, es: 'abrir', en: 'to open', ending: 'the door la puerta' },
    { n: 63, es: 'pedir', en: 'to order', ending: 'the dinner la cena' },
    { n: 64, es: 'pasar', en: 'to pass', ending: 'the test el examen' },
    { n: 65, es: 'pagar', en: 'to pay', ending: 'the taxes los impuestos' },
    { n: 66, es: 'practicar', en: 'to practice', ending: 'sports deportes' },
    { n: 67, es: 'poner', en: 'to put', ending: 'sauce on the pizza salsa a la pizza' },
    { n: 68, es: 'leer', en: 'to read', ending: 'the newspaper el periódico' },
    { n: 69, es: 'recordar', en: 'to remember', ending: 'the names los nombres' },
    { n: 70, es: 'descansar', en: 'to rest', ending: 'on vacation en las vacaciones' },
    { n: 71, es: 'regresar', en: 'to return', ending: 'to the car al coche' },
    { n: 72, es: 'correr', en: 'to run', ending: 'far lejos' },
    { n: 73, es: 'decir', en: 'to say', ending: 'the truth la verdad' },
    { n: 74, es: 'ver', en: 'to see', ending: 'the movie la película' },
    { n: 75, es: 'vender', en: 'to sell', ending: 'the jewelry las joyas' },
    { n: 76, es: 'compartir', en: 'to share', ending: 'the snack la merienda' },
    { n: 77, es: 'cantar', en: 'to sing', ending: 'the song la canción' },
    { n: 78, es: 'dormir', en: 'to sleep', ending: 'in the bed en la cama' },
    { n: 79, es: 'empezar', en: 'to start', ending: 'the class la clase' },
    { n: 80, es: 'estudiar', en: 'to study', ending: 'the lesson la lección' },
    { n: 81, es: 'tomar', en: 'to take', ending: 'the medicine la medicina' },
    { n: 82, es: 'sacar', en: 'to take out', ending: 'the garbage la basura' },
    { n: 83, es: 'hablar', en: 'to talk', ending: 'with the neighbor con el vecino' },
    { n: 84, es: 'enseñar', en: 'to teach', ending: 'English inglés' },
    { n: 85, es: 'pensar', en: 'to think', ending: 'too much demasiado' },
    { n: 86, es: 'tocar', en: 'to touch', ending: 'the floor el piso' },
    { n: 87, es: 'viajar', en: 'to travel', ending: 'to Mexico a México' },
    { n: 88, es: 'doblar', en: 'to turn', ending: 'to the left a la izquierda' },
    { n: 89, es: 'entender', en: 'to understand', ending: 'the book el libro' },
    { n: 90, es: 'usar', en: 'to use', ending: 'the car el coche' },
    { n: 91, es: 'visitar', en: 'to visit', ending: 'the city la ciudad' },
    { n: 92, es: 'esperar', en: 'to wait for', ending: 'dinner la cena' },
    { n: 93, es: 'caminar', en: 'to walk', ending: 'by the beach por la playa' },
    { n: 94, es: 'querer', en: 'to want', ending: 'ice cream helado' },
    { n: 95, es: 'lavar', en: 'to wash', ending: 'the dishes los platos' },
    { n: 96, es: 'mirar', en: 'to watch', ending: 'the game el partido' },
    { n: 97, es: 'usar', en: 'to wear', ending: 'a shirt una camisa' },
    { n: 98, es: 'ganar', en: 'to win', ending: 'the game el juego' },
    { n: 99, es: 'trabajar', en: 'to work', ending: 'in the company en la compañía' },
    { n: 100, es: 'escribir', en: 'to write', ending: 'a poem un poema' },
    { n: 101, es: 'aceptar', en: 'to accept', ending: 'the invitation la invitación' },
    { n: 102, es: 'agregar', en: 'to add', ending: 'more money más dinero' },
    { n: 103, es: 'asistir', en: 'to attend', ending: 'the party a la fiesta' },
    { n: 104, es: 'evitar', en: 'to avoid', ending: 'the traffic el tráfico' },
    { n: 105, es: 'bañarse', en: 'to bathe (oneself)', ending: 'in the morning en la mañana' },
    { n: 106, es: 'llamarse', en: 'to be called', ending: 'doctor Smith doctor Smith' },
    { n: 107, es: 'haber', en: 'to be there', ending: 'pizza pizza' },
    { n: 108, es: 'romper', en: 'to break', ending: 'the eggs los huevos' },
    { n: 109, es: 'cepillarse', en: 'to brush (teeth)', ending: 'the teeth los dientes' },
    { n: 110, es: 'calmarse', en: 'to calm down', ending: 'after the argument después de la pelea' },
    { n: 111, es: 'cancelar', en: 'to cancel', ending: 'the appointment la cita' },
    { n: 112, es: 'celebrar', en: 'to celebrate', ending: 'the birthday el cumpleaños' },
    { n: 113, es: 'cobrar', en: 'to charge', ending: 'a fee una tarifa' },
    { n: 114, es: 'elegir', en: 'to choose', ending: 'a career una carrera' },
    { n: 115, es: 'comunicarse', en: 'to communicate', ending: 'with the students con los estudiantes' },
    { n: 116, es: 'contactar', en: 'to contact', ending: 'the boss al jefe' },
    { n: 117, es: 'copiar', en: 'to copy', ending: 'the papers los papeles' },
    { n: 118, es: 'costar', en: 'to cost', ending: 'a lot mucho' },
    { n: 119, es: 'cubrir', en: 'to cover', ending: 'the pot la olla' },
    { n: 120, es: 'chocar', en: 'to crash', ending: 'the car el coche' },
    { n: 121, es: 'crear', en: 'to create', ending: 'a company una empresa' },
    { n: 122, es: 'cruzar', en: 'to cross', ending: 'the street la calle' },
    { n: 123, es: 'llorar', en: 'to cry', ending: 'from the pain del dolor' },
    { n: 124, es: 'curar', en: 'to cure', ending: 'the disease la enfermedad' },
    { n: 125, es: 'cortar', en: 'to cut', ending: 'the flowers las flores' },
    { n: 126, es: 'decidir', en: 'to decide', ending: 'what to do qué hacer' },
    { n: 127, es: 'borrar', en: 'to delete', ending: 'the messages los mensajes' },
    { n: 128, es: 'entregar', en: 'to deliver', ending: 'the package el paquete' },
    { n: 129, es: 'describir', en: 'to describe', ending: 'the person a la persona' },
    { n: 130, es: 'morir', en: 'to die', ending: 'peacefully pacíficamente' },
    { n: 131, es: 'dividir', en: 'to divide', ending: 'the food la comida' },
    { n: 132, es: 'conducir', en: 'to drive', ending: 'the car el coche' },
    { n: 133, es: 'ejercitarse', en: 'to exercise', ending: 'at the gym en el gimnasio' },
    { n: 134, es: 'experimentar', en: 'to experience', ending: 'new things cosas nuevas' },
    { n: 135, es: 'explicar', en: 'to explain', ending: 'the topic el tema' },
    { n: 136, es: 'caerse', en: 'to fall down', ending: '(de) down the stairs de las escaleras' },
    { n: 137, es: 'sentirse', en: 'to feel (emotion)', ending: 'happy feliz' },
    { n: 138, es: 'sentir', en: 'to feel (touch)', ending: 'the wind el viento' },
    { n: 139, es: 'pelear', en: 'to fight', ending: 'with a friend con una amiga' },
    { n: 140, es: 'llenar', en: 'to fill', ending: 'refrigerator el refrigerador' },
    { n: 141, es: 'acabar', en: 'to finish', ending: 'the meal la comida' },
    { n: 142, es: 'volar', en: 'to fly', ending: 'on the plane en el avión' },
    { n: 143, es: 'seguir', en: 'to follow', ending: 'the instructions las instrucciones' },
    { n: 144, es: 'freír', en: 'to fry', ending: 'the potatoes las papas' },
    { n: 145, es: 'vestirse', en: 'to get dressed', ending: 'for work para el trabajo' },
    { n: 146, es: 'levantarse', en: 'to get up', ending: 'at 8 am a las 8 am' },
    { n: 147, es: 'regalar', en: 'to give (a gift)', ending: 'tickets to the concert entradas para el concierto' },
    { n: 148, es: 'guiar', en: 'to guide', ending: 'the group al grupo' },
    { n: 149, es: 'pasar', en: 'to happen', ending: 'today hoy' },
    { n: 150, es: 'divertirse', en: 'to have fun', ending: 'at the party en la fiesta' },
    { n: 151, es: 'incluir', en: 'to include', ending: 'the neighbors a los vecinos' },
    { n: 152, es: 'invitar', en: 'to invite', ending: 'the guests a los invitados' },
    { n: 153, es: 'guardar', en: 'to keep (save)', ending: 'the milk in the fridge la leche en la heladera' },
    { n: 154, es: 'unirse', en: 'to join', ending: 'the group al grupo' },
    { n: 155, es: 'reírse', en: 'to laugh at', ending: '(de) the joke la broma' },
    { n: 156, es: 'irse', en: 'to leave', ending: 'early temprano' },
    { n: 157, es: 'dejar', en: 'to leave (behind)', ending: 'the coat el abrigo' },
    { n: 158, es: 'avisar', en: 'to let (someone) know', ending: '(a alguien) today a alguien hoy' },
    { n: 159, es: 'verse', en: 'to look (physically)', ending: 'sexy sexy' },
    { n: 160, es: 'encontrarse', en: 'to meet up (with)', ending: '(con) the person la persona' },
    { n: 161, es: 'extrañar', en: 'to miss (emotionally)', ending: 'the family a la familia' },
    { n: 162, es: 'mover', en: 'to move (something)', ending: 'the chair la silla' },
    { n: 163, es: 'mudarse', en: 'to move (residence)', ending: 'to Mexico a México' },
    { n: 164, es: 'ofrecer', en: 'to offer', ending: 'help ayuda' },
    { n: 165, es: 'organizar', en: 'to organize', ending: 'the papers los papeles' },
    { n: 166, es: 'deber', en: 'to owe', ending: 'money dinero' },
    { n: 167, es: 'estacionar', en: 'to park', ending: 'in the parking lot en el estacionamiento' },
    { n: 168, es: 'recoger', en: 'to pick up', ending: 'the person from the airport a la persona del aeropuerto' },
    { n: 169, es: 'planear', en: 'to plan', ending: 'the vacation las vacaciones' },
    { n: 170, es: 'jugar', en: 'to play', ending: 'to soccer al fútbol' },
    { n: 171, es: 'preferir', en: 'to prefer', ending: 'the Cuban food la comida cubana' },
    { n: 172, es: 'llover', en: 'to rain', ending: 'today hoy' },
    { n: 173, es: 'recibir', en: 'to receive', ending: 'a call una llamada' },
    { n: 174, es: 'reconocer', en: 'to recognize', ending: 'the person a la persona' },
    { n: 175, es: 'recomendar', en: 'to recommend', ending: 'the restaurant el restaurante' },
    { n: 176, es: 'relajarse', en: 'to relax', ending: 'on the weekend el fin de semana' },
    { n: 177, es: 'alquilar', en: 'to rent', ending: 'the apartment el departamento' },
    { n: 178, es: 'repetir', en: 'to repeat', ending: 'the song la canción' },
    { n: 179, es: 'responder', en: 'to respond', ending: 'to the messages a los mensajes' },
    { n: 180, es: 'devolver', en: 'to return (something)', ending: 'the purchase la compra' },
    { n: 181, es: 'volver', en: 'to return (somewhere)', ending: 'home a casa' },
    { n: 182, es: 'servir', en: 'to serve', ending: 'the tea el té' },
    { n: 183, es: 'mostrar', en: 'to show', ending: 'the passport el pasaporte' },
    { n: 184, es: 'ducharse', en: 'to shower', ending: 'at night en la noche' },
    { n: 185, es: 'sentarse', en: 'to sit down', ending: 'on the bench en el banco' },
    { n: 186, es: 'sonreír', en: 'to smile', ending: 'at the camera a la cámara' },
    { n: 187, es: 'nevar', en: 'to snow', ending: 'in the mountains en las montañas' },
    { n: 188, es: 'gastar', en: 'to spend', ending: 'the money el dinero' },
    { n: 189, es: 'quedarse', en: 'to stay', ending: 'in the house en la casa' },
    { n: 190, es: 'parar', en: 'to stop', ending: 'at the intersection en la intersección' },
    { n: 191, es: 'nadar', en: 'to swim', ending: 'in the pool en la piscina' },
    { n: 192, es: 'quitarse', en: 'to take off (something)', ending: 'the shoes los zapatos' },
    { n: 193, es: 'contar', en: 'to tell', ending: 'the story la historia' },
    { n: 194, es: 'probar', en: 'to try (something out)', ending: 'the dessert el postre' },
    { n: 195, es: 'girar', en: 'to turn', ending: 'at the corner en la esquina' },
    { n: 196, es: 'apagar', en: 'to turn off', ending: 'the lights las luces' },
    { n: 197, es: 'prender', en: 'to turn on', ending: 'the lamp la lámpara' },
    { n: 198, es: 'despertarse', en: 'to wake up', ending: 'at 9 am a las 9 am' },
    { n: 199, es: 'lavarse', en: 'to wash (oneself)', ending: 'with soap con jabón' },
    { n: 200, es: 'apuntar', en: 'to write down', ending: 'the number el número' },
  ];

  /* ---------------- persons ---------------- */
  const PERSONS = [
    { id: 'yo', subj: 'Yo', en: 'I', clitic: 'me' },
    { id: 'tu', subj: 'Tú', en: 'You', clitic: 'te' },
    { id: 'el', subj: 'Él/Ella', en: 'He/She', clitic: 'se' },
    { id: 'nosotros', subj: 'Nosotros', en: 'We', clitic: 'nos' },
    { id: 'ellos', subj: 'Ellos/Uds.', en: 'They', clitic: 'se' },
  ];
  const PERSON_IDS = PERSONS.map(p => p.id);
  const TENSES = [
    { id: 'presente', label: 'Presente', en: 'present' },
    { id: 'preterito', label: 'Pretérito', en: 'simple past' },
  ];
  const TENSE_BY_ID = {};
  TENSES.forEach(t => { TENSE_BY_ID[t.id] = t; });

  /* ---------------- tiny helpers (core.js is not loaded yet) ---------------- */
  function nkey(s) {
    return String(s == null ? '' : s).toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[¿?¡!.,;:()"'´`\-\/]/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }
  function slug(s) {
    return nkey(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  function unique(list) { return Array.from(new Set(list.filter(Boolean))); }
  /* deterministic spread picker: same deck every load, varied distractors */
  function pickFrom(pool, correct, salt, n) {
    const out = [];
    const seen = new Set([nkey(correct)]);
    if (!pool || !pool.length) return out;
    for (let i = 0; i < pool.length && out.length < (n || 3); i++) {
      const cand = pool[(salt * 7 + i * 3) % pool.length];
      if (cand == null) continue;
      const k = nkey(cand);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(cand);
    }
    return out;
  }
  /* rotate a slice of a pool deterministically so different cards see different
     candidates; two passes (preferred, then fallback) guarantee 4 options */
  function rotatePick(list, salt, n) {
    const out = [];
    if (!list || !list.length) return out;
    for (let i = 0; i < list.length && out.length < n; i++) out.push(list[(salt * 5 + i) % list.length]);
    return out;
  }
  function optionsFor(correct, preferred, fallback, salt) {
    const out = [correct];
    const seen = new Set([nkey(correct)]);
    [preferred, fallback].forEach((list, li) => {
      rotatePick(list, salt + li * 3, list ? Math.min(list.length, 14) : 0).forEach(cand => {
        if (out.length >= 4 || cand == null) return;
        const k = nkey(cand);
        if (!k || seen.has(k)) return;
        seen.add(k);
        out.push(cand);
      });
    });
    return out;
  }
  function uniqueBy(list, fn) {
    const seen = new Set();
    const out = [];
    list.forEach(x => {
      const k = fn(x);
      if (seen.has(k)) return;
      seen.add(k);
      out.push(x);
    });
    return out;
  }

  /* ---------------- the handout verbs, de-duplicated ---------------- */
  const ROW_BY_LEMMA = {};
  ROWS.forEach(r => {
    if (!ROW_BY_LEMMA[r.es]) ROW_BY_LEMMA[r.es] = [];
    ROW_BY_LEMMA[r.es].push(r.n);
  });
  const A2_WORDS = (typeof DATA !== 'undefined' && DATA.A2 && DATA.A2.words) ? DATA.A2.words : [];
  const WORD_BY_ES = {};
  A2_WORDS.forEach(w => { if (!WORD_BY_ES[w.es]) WORD_BY_ES[w.es] = w; });

  const VERBS = uniqueBy(ROWS, r => r.es).map(r => {
    const word = WORD_BY_ES[r.es];
    return {
      es: r.es,
      en: (word && word.en) || r.en,
      handoutEn: r.en,
      nums: ROW_BY_LEMMA[r.es].slice(),
      ending: (r.es.endsWith('se') ? r.es.slice(0, -2) : r.es).slice(-2),
    };
  });

  /* ---------------- conjugation ---------------- */
  const PRESENT_ENDINGS = {
    ar: ['o', 'as', 'a', 'amos', 'an'],
    er: ['o', 'es', 'e', 'emos', 'en'],
    ir: ['o', 'es', 'e', 'imos', 'en'],
  };
  const PRET_ENDINGS = {
    ar: ['é', 'aste', 'ó', 'amos', 'aron'],
    er: ['í', 'iste', 'ió', 'imos', 'ieron'],
    ir: ['í', 'iste', 'ió', 'imos', 'ieron'],
  };
  /* stem changes in the present (bare infinitive → change type) */
  const STEM_CHANGE = {
    cerrar: 'e→ie', comenzar: 'e→ie', despertar: 'e→ie', divertir: 'e→ie', empezar: 'e→ie',
    entender: 'e→ie', nevar: 'e→ie', pensar: 'e→ie', perder: 'e→ie', preferir: 'e→ie',
    querer: 'e→ie', recomendar: 'e→ie', sentar: 'e→ie', sentir: 'e→ie',
    almorzar: 'o→ue', contar: 'o→ue', costar: 'o→ue', devolver: 'o→ue', dormir: 'o→ue', poder: 'o→ue',
    encontrar: 'o→ue', llover: 'o→ue', morir: 'o→ue', mostrar: 'o→ue', mover: 'o→ue',
    probar: 'o→ue', recordar: 'o→ue', volar: 'o→ue', volver: 'o→ue',
    jugar: 'u→ue',
    conseguir: 'e→i', elegir: 'e→i', pedir: 'e→i', repetir: 'e→i', seguir: 'e→i',
    servir: 'e→i', vestir: 'e→i',
    freír: 'e→í', reír: 'e→í', sonreír: 'e→í',
  };
  /* verbs whose preterite changes the stem only in the 3rd persons (él/ellos) */
  const PRET_STEM_CHANGE = {
    conseguir: 'e→i', divertir: 'e→i', dormir: 'o→u', elegir: 'e→i', morir: 'o→u',
    pedir: 'e→i', preferir: 'e→i', repetir: 'e→i', seguir: 'e→i', sentir: 'e→i',
    servir: 'e→i', vestir: 'e→i',
  };
  /* fully irregular present paradigms (person order) */
  const PRESENT_IRREG = {
    ser: ['soy', 'eres', 'es', 'somos', 'son'],
    estar: ['estoy', 'estás', 'está', 'estamos', 'están'],
    ir: ['voy', 'vas', 'va', 'vamos', 'van'],
    haber: ['he', 'has', 'ha', 'hemos', 'han'],
    tener: ['tengo', 'tienes', 'tiene', 'tenemos', 'tienen'],
    venir: ['vengo', 'vienes', 'viene', 'venimos', 'vienen'],
    hacer: ['hago', 'haces', 'hace', 'hacemos', 'hacen'],
    poner: ['pongo', 'pones', 'pone', 'ponemos', 'ponen'],
    decir: ['digo', 'dices', 'dice', 'decimos', 'dicen'],
    traer: ['traigo', 'traes', 'trae', 'traemos', 'traen'],
    saber: ['sé', 'sabes', 'sabe', 'sabemos', 'saben'],
    salir: ['salgo', 'sales', 'sale', 'salimos', 'salen'],
    dar: ['doy', 'das', 'da', 'damos', 'dan'],
    ver: ['veo', 'ves', 've', 'vemos', 'ven'],
    oír: ['oigo', 'oyes', 'oye', 'oímos', 'oyen'],
    caer: ['caigo', 'caes', 'cae', 'caemos', 'caen'],
    conocer: ['conozco', 'conoces', 'conoce', 'conocemos', 'conocen'],
    ofrecer: ['ofrezco', 'ofreces', 'ofrece', 'ofrecemos', 'ofrecen'],
    reconocer: ['reconozco', 'reconoces', 'reconoce', 'reconocemos', 'reconocen'],
    conducir: ['conduzco', 'conduces', 'conduce', 'conducimos', 'conducen'],
    recoger: ['recojo', 'recoges', 'recoge', 'recogemos', 'recogen'],
    elegir: ['elijo', 'eliges', 'elige', 'elegimos', 'eligen'],
    seguir: ['sigo', 'sigues', 'sigue', 'seguimos', 'siguen'],
    conseguir: ['consigo', 'consigues', 'consigue', 'conseguimos', 'consiguen'],
    incluir: ['incluyo', 'incluyes', 'incluye', 'incluimos', 'incluyen'],
    continuar: ['continúo', 'continúas', 'continúa', 'continuamos', 'continúan'],
    guiar: ['guío', 'guías', 'guía', 'guiamos', 'guían'],
    reír: ['río', 'ríes', 'ríe', 'reímos', 'ríen'],
    freír: ['frío', 'fríes', 'fríe', 'freímos', 'fríen'],
    sonreír: ['sonrío', 'sonríes', 'sonríe', 'sonreímos', 'sonríen'],
  };
  /* fully irregular preterite paradigms (person order) */
  const PRET_IRREG = {
    ser: ['fui', 'fuiste', 'fue', 'fuimos', 'fueron'],
    ir: ['fui', 'fuiste', 'fue', 'fuimos', 'fueron'],
    estar: ['estuve', 'estuviste', 'estuvo', 'estuvimos', 'estuvieron'],
    tener: ['tuve', 'tuviste', 'tuvo', 'tuvimos', 'tuvieron'],
    haber: ['hube', 'hubiste', 'hubo', 'hubimos', 'hubieron'],
    poder: ['pude', 'pudiste', 'pudo', 'pudimos', 'pudieron'],
    poner: ['puse', 'pusiste', 'puso', 'pusimos', 'pusieron'],
    querer: ['quise', 'quisiste', 'quiso', 'quisimos', 'quisieron'],
    venir: ['vine', 'viniste', 'vino', 'vinimos', 'vinieron'],
    hacer: ['hice', 'hiciste', 'hizo', 'hicimos', 'hicieron'],
    decir: ['dije', 'dijiste', 'dijo', 'dijimos', 'dijeron'],
    traer: ['traje', 'trajiste', 'trajo', 'trajimos', 'trajeron'],
    saber: ['supe', 'supiste', 'supo', 'supimos', 'supieron'],
    dar: ['di', 'diste', 'dio', 'dimos', 'dieron'],
    ver: ['vi', 'viste', 'vio', 'vimos', 'vieron'],
    conducir: ['conduje', 'condujiste', 'condujo', 'condujimos', 'condujeron'],
    leer: ['leí', 'leíste', 'leyó', 'leímos', 'leyeron'],
    creer: ['creí', 'creíste', 'creyó', 'creímos', 'creyeron'],
    caer: ['caí', 'caíste', 'cayó', 'caímos', 'cayeron'],
    oír: ['oí', 'oíste', 'oyó', 'oímos', 'oyeron'],
    incluir: ['incluí', 'incluiste', 'incluyó', 'incluimos', 'incluyeron'],
    reír: ['reí', 'reíste', 'rió', 'reímos', 'rieron'],
    freír: ['freí', 'freíste', 'frió', 'freímos', 'frieron'],
    sonreír: ['sonreí', 'sonreíste', 'sonrió', 'sonreímos', 'sonrieron'],
    guiar: ['guié', 'guiaste', 'guió', 'guiamos', 'guiaron'],
  };
  /* two verbs only live in the 3rd person (weather) */
  const DEFECTIVE = { llover: 1, nevar: 1 };

  function splitVerb(es) {
    const refl = es.endsWith('se');
    const inf = refl ? es.slice(0, -2) : es;
    const raw = inf.slice(-2);
    /* reír / freír / oír / sonreír end in -ír: treat as -ir */
    const ending = raw === 'ír' ? 'ir' : raw;
    return { refl, inf, stem: inf.slice(0, -2), ending };
  }
  function applyStem(stem, type) {
    if (type === 'e→ie') return stem.replace(/e(?=[^e]*$)/, 'ie');
    if (type === 'o→ue') return stem.replace(/o(?=[^o]*$)/, 'ue');
    if (type === 'u→ue') return stem.replace(/u(?=[^u]*$)/, 'ue');
    if (type === 'e→i') return stem.replace(/e(?=[^e]*$)/, 'i');
    if (type === 'e→í') return stem.replace(/e(?=[^e]*$)/, 'í');
    if (type === 'o→u') return stem.replace(/o(?=[^o]*$)/, 'u');
    return stem;
  }
  /* naive regular paradigms — used to measure how far a verb is from regular */
  function naivePresent(stem, ending) {
    const e = PRESENT_ENDINGS[ending];
    return PERSON_IDS.map((_, i) => stem + e[i]);
  }
  function naivePreterite(stem, ending) {
    const e = PRET_ENDINGS[ending];
    return PERSON_IDS.map((_, i) => stem + e[i]);
  }
  function spellingPreteriteYo(inf, stem) {
    if (inf.endsWith('car')) return stem.slice(0, -1) + 'qué';
    if (inf.endsWith('gar')) return stem.slice(0, -1) + 'gué';
    if (inf.endsWith('zar')) return stem.slice(0, -1) + 'cé';
    return stem + 'é';
  }
  function printOf(v) { return (v === 'e') ? 'e' : v; }

  function conjugate(es) {
    const { refl, inf, stem, ending } = splitVerb(es);
    const bare = inf;
    const present = [];
    const preterite = [];
    const notes = [];

    if (PRESENT_IRREG[bare]) {
      PRESENT_IRREG[bare].forEach(f => present.push(f));
    } else {
      const type = STEM_CHANGE[bare] || null;
      const changed = type ? applyStem(stem, type) : stem;
      const e = PRESENT_ENDINGS[ending];
      PERSON_IDS.forEach((pid, i) => {
        const useChanged = i !== 3; /* nosotros keeps the plain stem */
        present.push((useChanged ? changed : stem) + e[i]);
      });
      if (type) notes.push('presente: cambio de raíz ' + type);
    }

    if (PRET_IRREG[bare]) {
      PRET_IRREG[bare].forEach(f => preterite.push(f));
      notes.push('pretérito irregular (ver test/fixtures/trainer-pret-100.json)');
    } else {
      const e = PRET_ENDINGS[ending];
      const type = PRET_STEM_CHANGE[bare] || null;
      const changed = type ? applyStem(stem, type) : stem;
      PERSON_IDS.forEach((pid, i) => {
        let form;
        if (i === 0) {
          form = (ending === 'ar') ? spellingPreteriteYo(inf, stem)
            : (bare.endsWith('cer') || bare.endsWith('cir') ? stem + 'í' : stem + 'í');
        } else if (i === 2 || i === 4) {
          form = (type ? changed : stem) + e[i];
        } else {
          form = stem + e[i];
        }
        preterite.push(form);
      });
      if (type) notes.push('pretérito: cambio de raíz ' + type + ' en 3ª persona');
      else if (preterite[0] !== stem + 'é' && preterite[0] !== stem + 'í') notes.push('pretérito: yo ' + preterite[0]);
    }

    /* how far from the naive regular pattern? (this is the "irregular" test) */
    const np = naivePresent(stem, ending);
    const npre = naivePreterite(stem, ending);
    if (ending === 'ar' && /\w/.test(stem)) {
      /* naively, -ar verbs take -é; the -car/-gar/-zar yo spelling is a change */
      npre[0] = (bare.endsWith('car') || bare.endsWith('gar') || bare.endsWith('zar')) ? stem + 'e' : npre[0];
    }
    const diffs = [];
    PERSON_IDS.forEach((pid, i) => {
      if (present[i] !== np[i]) diffs.push('p' + i);
      if (preterite[i] !== npre[i]) diffs.push('t' + i);
    });

    let irregular = diffs.length > 0;
    /* classify */
    const tags = [];
    const presentChanged = PERSON_IDS.some((pid, i) => present[i] !== np[i]);
    const presentOnlyYo = present[0] !== np[0] && PERSON_IDS.every((pid, i) => i === 0 || present[i] === np[i]);
    const presentStem = STEM_CHANGE[bare];
    const pretType = PRET_STEM_CHANGE[bare];
    const strongPreterite = !!(PRET_IRREG[bare]);
    const pretOnlyYo = preterite[0] !== npre[0] && PERSON_IDS.every((pid, i) => i === 0 || preterite[i] === npre[i]);
    if (presentStem) tags.push('presente ' + presentStem);
    if (presentOnlyYo && !presentStem) tags.push('yo ' + present[0]);
    else if (presentChanged && !presentStem) tags.push('presente irregular');
    if (strongPreterite) tags.push('pretérito fuerte (' + preterite[0] + ')');
    else if (pretType) tags.push('pretérito ' + pretType + ' en 3ª persona');
    else if (pretOnlyYo) tags.push('yo ' + preterite[0] + ' (cambio de ortografía)');
    else if (preterite.some((f, i) => f !== npre[i])) tags.push('pretérito irregular');

    /* short label for the card badge */
    let short = '';
    if (presentStem && pretType) short = presentStem + ' · 3ª pers. ' + pretType;
    else if (presentStem && pretOnlyYo) short = presentStem + ' · yo ' + preterite[0];
    else if (strongPreterite) short = 'pretérito fuerte (' + preterite[0] + ')';
    else if (presentStem) short = presentStem;
    else if (pretType) short = 'pretérito ' + pretType + ' (3ª pers.)';
    else if (pretOnlyYo) short = 'yo ' + preterite[0];
    else if (presentOnlyYo) short = 'yo ' + present[0];
    else if (tags.length) short = tags[0];
    if (short.length > 42) short = short.slice(0, 40) + '…';

    return {
      es, inf: bare, refl, stem, ending,
      present, preterite,
      presentP: present.map((f, i) => (refl ? PERSONS[i].clitic + ' ' : '') + f),
      preteriteP: preterite.map((f, i) => (refl ? PERSONS[i].clitic + ' ' : '') + f),
      irregular,
      defective: !!DEFECTIVE[bare],
      tags, short, notes,
      why: tags.length ? tags.join(' · ') : 'regular',
    };
  }

  /* ---------------- 11 magic frames ---------------- */
  const MAGIC_FRAMES = [
    { id: 'necesitar', label: 'necesitar + infinitivo', yo: 'Necesito', en: g => 'I need to ' + g },
    { id: 'tener-que', label: 'tener que + infinitivo', yo: 'Tengo que', en: g => 'I have to ' + g },
    { id: 'querer', label: 'querer + infinitivo', yo: 'Quiero', en: g => 'I want to ' + g },
    { id: 'ir-a', label: 'ir a + infinitivo', yo: 'Voy a', en: g => 'I am going to ' + g },
    { id: 'poder', label: 'poder + infinitivo', yo: 'Puedo', en: g => 'I can ' + g },
    { id: 'acabar-de', label: 'acabar de + infinitivo', yo: 'Acabo de', en: g => 'I have just (' + g + ')' },
    { id: 'podria', label: 'podría + infinitivo', yo: 'Podría', en: g => 'I could ' + g },
    { id: 'deberia', label: 'debería + infinitivo', yo: 'Debería', en: g => 'I should ' + g },
    { id: 'soler', label: 'soler + infinitivo', yo: 'Suelo', en: g => 'I usually ' + g },
    { id: 'gustar', label: 'me gusta + infinitivo', yo: 'Me gusta', en: g => 'I like to ' + g },
    { id: 'gustaria', label: 'me gustaría + infinitivo', yo: 'Me gustaría', en: g => 'I would like to ' + g },
  ];
  /* any verb used inside a frame keeps the yo clitic when reflexive */
  function infinitiveFor(verbEs, clitic) {
    const s = splitVerb(verbEs);
    return s.refl ? s.inf + clitic : verbEs;
  }
  function magicSentence(frame, verb, conj) {
    if (conj.defective) {
      const base = conj.inf;
      const weather = {
        necesitar: ['Necesita ' + base, 'It needs to ' + base],
        'tener-que': ['Tiene que ' + base, 'It has to ' + base],
        querer: ['Quiere ' + base, 'It wants to ' + base],
        'ir-a': ['Va a ' + base, 'It is going to ' + base],
        poder: ['Puede ' + base, 'It can ' + base],
        'acabar-de': ['Acaba de ' + base, 'It has just ' + base + 'ed'],
        podria: ['Podría ' + base, 'It could ' + base],
        deberia: ['Debería ' + base, 'It should ' + base],
        soler: ['Suele ' + base, 'It usually ' + base + 's'],
        gustar: ['Me gusta cuando ' + (base === 'llover' ? 'llueve' : 'nieva'), 'I like it when it ' + base + 's'],
        gustaria: ['Me gustaría que ' + (base === 'llover' ? 'lloviera' : 'nevara'), 'I would like it to ' + base],
      };
      return weather[frame.id];
    }
    const g = englishBase(verb.en);
    const es = frame.yo + ' ' + infinitiveFor(verb.es, 'me');
    const en = frame.en(g);
    return [es, en];
  }

  /* ---------------- English helpers ---------------- */
  function englishBase(en) {
    return String(en || '')
      .replace(/^to\s+/i, '')
      .split('/')[0]
      .replace(/\(.*?\)/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function personEnglish(personId) {
    return { yo: 'I', tu: 'you', el: 'he/she', nosotros: 'we', ellos: 'they' }[personId];
  }
  function personSpanish(personId) {
    return { yo: 'Yo', tu: 'Tú', el: 'Él/Ella', nosotros: 'Nosotros', ellos: 'Ellos/Uds.' }[personId];
  }

  /* ---------------- glue words (214 cards) ---------------- */
  const GLUE_CATS = ['pronouns', 'possessives', 'question words', 'demonstratives', 'location',
    'time', 'adverbs', 'quantity', 'comparisons', 'prepositions', 'conjunctions'];
  const GLUE = uniqueBy(A2_WORDS.filter(w => GLUE_CATS.indexOf(w.cat) >= 0), w => w.es);

  /* ---------------- card factory ---------------- */
  function makeCard(o) {
    return {
      id: o.id,
      cardType: 'verbCard',
      group: o.group,
      subType: o.group,
      direction: o.direction,
      badge: o.badge,
      prompt: o.prompt,
      es: o.es,
      en: o.en,
      answer: o.answer,
      options: o.options,
      rows: o.rows || [],
      say: o.say || o.es,
      verbEs: o.verbEs || null,
      verbEn: o.verbEn || null,
      tense: o.tense || null,
      person: o.person || null,
      frameId: o.frameId || null,
      irregular: !!o.irregular,
      defective: !!o.defective,
      handoutNo: o.handoutNo || null,
    };
  }
  function labels(pairs) { return pairs.map(p => ({ k: p[0], v: p[1] })); }
  function tableRows(conj, verb) {
    const rows = [];
    rows.push(['Infinitivo', verb.es + ' — ' + verb.en]);
    if (conj.defective) {
      rows.push(['Presente', 'Él/Ella ' + conj.present[2] + ' · Ellos/Uds. ' + conj.present[4] + ' (3rd person only)']);
      rows.push(['Pretérito', 'Él/Ella ' + conj.preterite[2] + ' · Ellos/Uds. ' + conj.preterite[4] + ' (3rd person only)']);
    } else {
      rows.push(['Presente', conj.presentP.map((f, i) => PERSONS[i].subj + ' ' + f).join(' · ')]);
      rows.push(['Pretérito', conj.preteriteP.map((f, i) => PERSONS[i].subj + ' ' + f).join(' · ')]);
    }
    if (conj.irregular) rows.push(['Irregular', conj.why]);
    if (conj.defective) rows.push(['Impersonal', 'llover / nevar have no personal forms — the person is always 3rd: ' + conj.present[2] + ' / ' + conj.present[4]]);
    if (conj.refl) rows.push(['Reflexivo', 'the pronoun goes with the person: ' + conj.presentP.join(' · ')]);
    return labels(rows);
  }

  /* ---------------- the bank builder ---------------- */
  function buildVerbCardBank() {
    const cards = [];
    const conj = {};
    VERBS.forEach(v => { conj[v.es] = conjugate(v.es); });
    const irregularVerbs = VERBS.filter(v => conj[v.es].irregular).length;

    /* pools for distractors */
    const infPool = VERBS.map(v => v.es);
    const enPool = unique(VERBS.map(v => v.en));
    const glueByEs = {};
    GLUE.forEach(w => { glueByEs[w.es] = w; });
    const glueEs = GLUE.map(w => w.es);
    const glueEn = GLUE.map(w => w.en);
    const glueSameCat = {};
    GLUE.forEach(w => {
      const list = GLUE.filter(x => x.cat === w.cat && x.es !== w.es);
      glueSameCat[w.es] = list.length >= 3 ? list.map(x => x.es) : glueEs;
      glueByEs[w.es] = w;
    });
    const glueSameCatEn = {};
    GLUE.forEach(w => {
      const list = GLUE.filter(x => x.cat === w.cat && x.es !== w.es);
      glueSameCatEn[w.es] = list.length >= 3 ? list.map(x => x.en) : glueEn;
    });

    /* wide fallback pools so every card has four real options */
    const allForms = [];
    const allEnLabels = [];
    const magicEsPool = [];
    const magicEnPool = [];
    VERBS.forEach(v => {
      const c = conj[v.es];
      c.presentP.concat(c.preteriteP).forEach(f => allForms.push(f));
      const g = englishBase(v.en);
      TENSES.forEach(t => PERSONS.forEach(p => allEnLabels.push(personEnglish(p.id) + ' · ' + g + ' · ' + t.en)));
      MAGIC_FRAMES.forEach(f => {
        const pair = magicSentence(f, v, c);
        magicEsPool.push(pair[0]);
        magicEnPool.push(pair[1]);
      });
    });

    /* --- 1. infinitive cards (regular 1, irregular 1) --- */
    VERBS.forEach((v, vi) => {
      const c = conj[v.es];
      const n = v.nums.length > 1 ? v.nums.map(x => '#' + x).join(' · ') : '#' + v.nums[0];
      const badge = (c.irregular ? 'Irregular verb · ' + n + ' · ' + c.short
        : 'Regular verb · ' + n + ' · -' + v.ending);
      const rows = tableRows(c, v);
      const esSide = v.es;
      const enSide = v.en;
      const enOpts = optionsFor(v.en, enPool, enPool, vi);
      const esOpts = optionsFor(v.es, infPool, infPool, vi + 1);
      cards.push(makeCard({
        id: 'A2-vc-inf-' + slug(v.es) + '-es', group: c.irregular ? 'irregular' : 'regular', direction: 'es-en',
        badge, prompt: esSide, es: esSide, en: enSide, answer: enSide,
        options: enOpts, rows,
        verbEs: v.es, verbEn: v.en, irregular: c.irregular, defective: c.defective, handoutNo: v.nums[0],
      }));
      cards.push(makeCard({
        id: 'A2-vc-inf-' + slug(v.es) + '-en', group: c.irregular ? 'irregular' : 'regular', direction: 'en-es',
        badge, prompt: enSide, es: esSide, en: enSide, answer: esSide,
        options: esOpts, rows,
        verbEs: v.es, verbEn: v.en, irregular: c.irregular, defective: c.defective, handoutNo: v.nums[0],
      }));
    });

    /* --- 2. person cards (all 5 for irregulars, yo only for regulars) --- */
    VERBS.forEach((v, vi) => {
      const c = conj[v.es];
      const persons = c.defective ? [PERSONS[2]] : (c.irregular ? PERSONS : [PERSONS[0]]);
      TENSES.forEach((t, ti) => {
        const formsP = t.id === 'presente' ? c.presentP : c.preteriteP;
        const forms = t.id === 'presente' ? c.present : c.preterite;
        persons.forEach((p, pi) => {
          const idx = PERSON_IDS.indexOf(p.id);
          const esForm = formsP[idx];
          const g = englishBase(v.en);
          const personEn = c.defective ? 'it' : personEnglish(p.id);
          const enSide = personEn + ' · ' + g + ' · ' + t.en;
          const badge = t.label + ' · ' + p.subj + (c.defective ? ' · impersonal (3rd person only)'
            : (c.irregular ? ' · irregular' : '')) + ' · #' + v.nums[0];
          /* distractors: same verb other persons/tense, then other verbs */
          const sameVerb = [];
          TENSES.forEach(t2 => {
            const list = t2.id === 'presente' ? c.presentP : c.preteriteP;
            list.forEach(f => sameVerb.push(f));
          });
          const optionsSalt = vi * 3 + pi * 2 + ti;
          const esOpts = optionsFor(esForm, unique(sameVerb), allForms, optionsSalt);
          const enOpts = [];
          PERSONS.forEach(p2 => {
            TENSES.forEach(t2 => {
              enOpts.push((c.defective ? 'it' : personEnglish(p2.id)) + ' · ' + g + ' · ' + t2.en);
            });
          });
          const enSideOpts = optionsFor(enSide, unique(enOpts), allEnLabels, optionsSalt + 1);
          const key = slug(v.es) + '-' + t.id + '-' + p.id;
          const rows = tableRows(c, v).concat(labels([
            ['Persona', p.subj + ' (' + (c.defective ? 'impersonal: it' : p.en) + ')'],
            ['Tiempo', t.label],
          ].filter(r => r[0])));
          cards.push(makeCard({
            id: 'A2-vc-' + key + '-es', group: c.irregular ? 'irregular' : 'regular', direction: 'es-en',
            badge, prompt: esForm, es: esForm, en: enSide, answer: enSide,
            options: enSideOpts, rows, say: esForm,
            verbEs: v.es, verbEn: v.en, tense: t.id, person: p.id, irregular: c.irregular, defective: c.defective,
          }));
          cards.push(makeCard({
            id: 'A2-vc-' + key + '-en', group: c.irregular ? 'irregular' : 'regular', direction: 'en-es',
            badge, prompt: enSide, es: esForm, en: enSide, answer: esForm,
            options: esOpts, rows, say: esForm,
            verbEs: v.es, verbEn: v.en, tense: t.id, person: p.id, irregular: c.irregular, defective: c.defective,
          }));
        });
      });
    });

    /* --- 3. magic-frame cards (all 190 verbs × 11 frames, first person) --- */
    VERBS.forEach((v, vi) => {
      const c = conj[v.es];
      MAGIC_FRAMES.forEach((frame, fi) => {
        const [esSentence, enSentence] = magicSentence(frame, v, c);
        const badge = 'Magic frame · ' + frame.label + (c.defective ? ' · impersonal' : '') + ' · #' + v.nums[0];
        /* distractors: same verb in the other 10 frames */
        const sameVerbEs = [];
        const sameVerbEn = [];
        MAGIC_FRAMES.forEach(other => {
          if (other.id === frame.id) return;
          const [es2, en2] = magicSentence(other, v, c);
          sameVerbEs.push(es2);
          sameVerbEn.push(en2);
        });
        const salt = vi * 13 + fi;
        const rows = labels([
          ['Frame', frame.label],
          ['Verbo', v.es + ' — ' + v.en],
          ['Persona', 'yo (' + (c.defective ? 'impersonal' : 'first person') + ')'],
          ['Regla', c.refl ? 'Two verbs: the frame is conjugated in the 1st person; the reflexive pronoun stays with the infinitive (' + infinitiveFor(v.es, 'me') + ').'
            : 'Two verbs: the magic verb is conjugated; the second verb stays in the infinitive.'],
        ]);
        cards.push(makeCard({
          id: 'A2-vc-magic-' + slug(v.es) + '-' + frame.id + '-es', group: 'magic', direction: 'es-en',
          badge, prompt: esSentence, es: esSentence, en: enSentence, answer: enSentence,
          options: optionsFor(enSentence, sameVerbEn, magicEnPool, salt), rows,
          say: esSentence, verbEs: v.es, verbEn: v.en, frameId: frame.id, person: 'yo',
          irregular: c.irregular, defective: c.defective,
        }));
        cards.push(makeCard({
          id: 'A2-vc-magic-' + slug(v.es) + '-' + frame.id + '-en', group: 'magic', direction: 'en-es',
          badge, prompt: enSentence, es: esSentence, en: enSentence, answer: esSentence,
          options: optionsFor(esSentence, sameVerbEs, magicEsPool, salt), rows,
          say: esSentence, verbEs: v.es, verbEn: v.en, frameId: frame.id, person: 'yo',
          irregular: c.irregular, defective: c.defective,
        }));
      });
    });

    /* --- 4. glue-word cards --- */
    GLUE.forEach((w, wi) => {
      const rows = labels([
        ['Categoría', w.cat],
        ['Español', w.es],
        ['English', w.en],
      ]);
      const esSide = w.es;
      const enSide = w.en;
      const esOpts = optionsFor(w.es, glueSameCat[w.es] || glueEs, glueEs, wi);
      const enOpts = optionsFor(w.en, glueSameCatEn[w.es] || glueEn, glueEn, wi + 1);
      const badge = 'Glue word · ' + w.cat;
      cards.push(makeCard({
        id: 'A2-vc-glue-' + wi + '-' + slug(w.es) + '-es', group: 'glue', direction: 'es-en',
        badge, prompt: esSide, es: esSide, en: enSide, answer: enSide,
        options: enOpts, rows, verbEs: null,
      }));
      cards.push(makeCard({
        id: 'A2-vc-glue-' + wi + '-' + slug(w.es) + '-en', group: 'glue', direction: 'en-es',
        badge, prompt: enSide, es: esSide, en: enSide, answer: esSide,
        options: esOpts, rows, verbEs: null,
      }));
    });

    return {
      cards,
      meta: {
        rows: ROWS.length,
        verbs: VERBS.length,
        irregular: irregularVerbs,
        regular: VERBS.length - irregularVerbs,
        magic: VERBS.length * MAGIC_FRAMES.length,
        glue: GLUE.length,
        perDirection: cards.length / 2,
        total: cards.length,
      },
    };
  }

  const bank = buildVerbCardBank();
  if (typeof DATA !== 'undefined' && DATA.A2) DATA.A2.verbCards = bank.cards;
  if (typeof window !== 'undefined') {
    window.buildVerbCardBank = buildVerbCardBank;
    window.VERB_DECK_META = bank.meta;
    window.VERB_DECK_CONJUGATE = conjugate;
    window.VERB_DECK_ROWS = ROWS;
    window.VERB_DECK_FRAMES = MAGIC_FRAMES;
  }
})();
