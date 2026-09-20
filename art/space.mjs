import { Canvas, art } from "./lib.mjs";

// ---- 10x10 ----
const rocket10 = new Canvas(10);
rocket10.poly([[4.5, 0], [7.5, 3], [7.5, 8], [1.5, 8], [1.5, 3]]).rect(0, 6, 2, 3).rect(8, 6, 2, 3).rect(3, 8, 3, 2).clear(3, 3, 3, 2);
rocket10.rect(4, 3, 1, 1);

const saturn = new Canvas(10);
saturn.disc(4.5, 4.5, 3).ring(4.5, 4.5, 4.6, 0.55);
for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) if (y < 4 && Math.hypot(x - 4.5, y - 4.5) > 3.2 && Math.hypot(x - 4.5, y - 4.5) < 5.4 && (x < 2 || x > 7 || y < 2)) saturn.set(x, y, 0);
saturn.clear(0, 0, 10, 2);
saturn.clear(3, 3, 1, 1);

const helmet = new Canvas(10);
helmet.disc(4.5, 4.2, 4.5).rect(1, 8, 8, 2).clear(2, 2, 6, 4).rect(3, 3, 1, 1).rect(6, 4, 1, 1);
helmet.rect(0, 4, 1, 2).rect(9, 4, 1, 2);

const ufo = new Canvas(10);
ufo.ellipse(4.5, 5.4, 4.6, 1.9).ellipse(4.5, 3.3, 2.6, 2.4).rect(1, 8, 1, 2).rect(4, 8, 2, 2).rect(8, 8, 1, 2);
ufo.clear(4, 2, 1, 1).clear(1, 5, 1, 1).clear(4, 5, 2, 1).clear(7, 5, 1, 1);

const moon = new Canvas(10);
moon.disc(4.5, 4.5, 4.6).disc(7, 3.6, 3.9, 0).rect(8, 0, 2, 2).rect(9, 7, 1, 1);

const sat = new Canvas(10);
sat.rect(3, 3, 4, 4).rect(0, 2, 3, 6).rect(7, 2, 3, 6).rect(4, 0, 2, 3).rect(4, 7, 2, 3);
sat.clear(1, 3, 1, 4).clear(8, 3, 1, 4).clear(4, 4, 2, 2).clear(3, 0, 1, 1);

const alien = new Canvas(10);
alien.ellipse(4.5, 4, 4.4, 3.8).rect(1, 0, 1, 2).rect(8, 0, 1, 2).rect(2, 8, 2, 2).rect(6, 8, 2, 2).rect(3, 7, 4, 1);
alien.clear(2, 3, 2, 2).clear(6, 3, 2, 2).clear(4, 6, 2, 1);

const comet = new Canvas(10);
comet.disc(7, 7, 2.6);
for (let i = 0; i < 8; i++) { comet.rect(6 - i, 2 - Math.floor(i / 2) + 0, 1, 1, 0); }
comet.poly([[0, 0], [5, 4], [4, 5]]).line(0, 4, 4, 6).line(4, 0, 6, 4).rect(3, 3, 3, 3);

// ---- 15x15 ----
const rocket = new Canvas(15);
rocket.poly([[7, 0], [11, 5], [11, 12], [3, 12], [3, 5]]).poly([[3, 8], [0, 14], [3, 12]]).poly([[11, 8], [14, 14], [11, 12]]);
rocket.rect(5, 12, 5, 3).disc(7, 7, 1.8, 0).clear(5, 12, 1, 1).clear(9, 12, 1, 1).rect(6, 13, 3, 2, 0).rect(7, 13, 1, 2);

const planet = new Canvas(15);
planet.disc(7, 7, 5.2);
for (let y = 0; y < 15; y++) for (let x = 0; x < 15; x++) {
  const e = ((x - 7) / 7.4) ** 2 + ((y - 7) / 2.6) ** 2;
  if (Math.abs(e - 1) < 0.3) planet.set(x, y, Math.hypot(x - 7, y - 7) <= 5.2 ? 0 : 1);
}

const astro = new Canvas(15);
astro.disc(7, 3.8, 3.8).rect(4, 7, 7, 5).rect(1, 8, 3, 2).rect(11, 8, 3, 2).rect(4, 12, 3, 3).rect(8, 12, 3, 3).rect(5, 8, 5, 3, 0).rect(6, 9, 3, 1);
astro.clear(5, 2, 5, 3).rect(9, 2, 1, 1).rect(1, 6, 3, 3);

// ---- 20x20 ----
const bigRocket = new Canvas(20);
bigRocket.poly([[9.5, 0], [14.5, 6], [14.5, 15], [4.5, 15], [4.5, 6]]).poly([[4.5, 10], [0, 19], [4.5, 16]]).poly([[14.5, 10], [19, 19], [14.5, 16]]);
bigRocket.rect(6, 15, 7, 3).disc(9.5, 8, 2.3, 0).disc(9.5, 8, 1.1);
bigRocket.rect(8, 18, 3, 2).clear(6, 15, 1, 1).clear(12, 15, 1, 1);
bigRocket.mirror();
bigRocket.rect(9, 0, 2, 20, 0).rect(9, 1, 2, 17).clear(9, 7, 2, 3).rect(9, 8, 2, 1);

export default [
  // 5x5
  { en: "Star", nl: "Ster", color: "#ffb638", art: art(`..#..\n..#..\n#####\n.###.\n.#.#.`) },
  { en: "Crescent moon", nl: "Maansikkel", color: "#ffb638", art: art(`.###.\n#....\n#....\n#....\n.###.`) },
  { en: "Rocket", nl: "Raket", color: "#e5484d", art: art(`..#..\n.###.\n.###.\n#####\n#.#.#`) },
  { en: "Planet", nl: "Planeet", color: "#9b86ff", art: art(`.###.\n#..##\n#####\n##..#\n.###.`) },
  { en: "UFO", nl: "Ufo", color: "#45c9a0", art: art(`..#..\n.###.\n#####\n#.#.#\n.....`) },
  { en: "Sun", nl: "Zon", color: "#ffb638", art: art(`.#.#.\n#####\n.###.\n#####\n.#.#.`) },
  { en: "Alien", nl: "Alien", color: "#8fd14f", art: art(`#...#\n#####\n#.#.#\n#####\n.#.#.`) },
  { en: "Meteor", nl: "Meteoor", color: "#a0764a", art: art(`##...\n###..\n.####\n..###\n..###`) },
  // 10x10
  { en: "Rocket", nl: "Raket", color: "#e5484d", art: rocket10 },
  { en: "Saturn", nl: "Saturnus", color: "#ffb638", art: saturn },
  { en: "Astronaut helmet", nl: "Astronautenhelm", color: "#5aa9ff", art: helmet },
  { en: "Flying saucer", nl: "Vliegende schotel", color: "#45c9a0", art: ufo },
  { en: "Moon and star", nl: "Maan en ster", color: "#ffb638", art: moon },
  { en: "Satellite", nl: "Satelliet", color: "#4f8fe8", art: sat },
  { en: "Little alien", nl: "Klein alien", color: "#8fd14f", art: alien },
  { en: "Comet", nl: "Komeet", color: "#ff8f5a", art: comet },
  // 15x15
  { en: "Rocket ship", nl: "Ruimteschip", color: "#e5484d", art: rocket },
  { en: "Ringed planet", nl: "Planeet met ring", color: "#9b86ff", art: planet },
  { en: "Astronaut", nl: "Astronaut", color: "#5aa9ff", art: astro },
  // 20x20
  { en: "Launch day", nl: "Lanceerdag", color: "#e5484d", art: bigRocket },
];
