import { Canvas, art } from "./lib.mjs";

// ---- 10x10 ----
const whale = new Canvas(10);
whale.ellipse(4.6, 6, 4.6, 3.2).poly([[7.5, 6], [10, 2], [10, 5], [9, 6.5]]).rect(4, 1, 1, 2).rect(3, 0, 1, 1).rect(5, 0, 1, 1);
whale.clear(2, 5, 1, 1).clear(1, 8, 1, 1);
whale.set(6, 4, 0);

const sailboat = new Canvas(10);
sailboat.poly([[0, 7], [10, 7], [8, 10], [2, 10]]).rect(4, 0, 1, 7).poly([[5, 0.5], [9, 6], [5, 6]]).poly([[4, 1.5], [0.5, 6], [4, 6]]);

const jelly = new Canvas(10);
jelly.ellipse(4.5, 3.6, 4.4, 3.5).clear(0, 5, 10, 1).rect(1, 6, 1, 4).rect(3, 6, 1, 3).rect(5, 6, 1, 4).rect(7, 6, 1, 3).rect(0, 5, 10, 1);
jelly.clear(3, 2, 1, 1).clear(6, 2, 1, 1);

const octopus = new Canvas(10);
octopus.ellipse(4.5, 3.6, 4, 3.6).rect(0, 6, 2, 4).rect(3, 7, 2, 3).rect(5, 7, 2, 3).rect(8, 6, 2, 4).rect(1, 6, 8, 2).clear(2, 3, 1, 2).clear(7, 3, 1, 2);

const crab = new Canvas(10);
crab.ellipse(4.5, 6, 3.6, 2.4).rect(0, 1, 2, 3).rect(8, 1, 2, 3).rect(1, 3, 1, 3).rect(8, 3, 1, 3).rect(1, 8, 1, 2).rect(3, 9, 1, 1).rect(6, 9, 1, 1).rect(8, 8, 1, 2);
crab.clear(0, 1, 1, 1).clear(9, 1, 1, 1).clear(3, 5, 1, 1).clear(6, 5, 1, 1);

const star10 = new Canvas(10);
star10.poly([[4.5, 0], [6, 3.4], [9.8, 3.6], [6.8, 6], [8, 9.8], [4.5, 7.6], [1, 9.8], [2.2, 6], [-0.8, 3.6], [3, 3.4]]);

const lighthouse = new Canvas(10);
lighthouse.poly([[3, 3], [6, 3], [7, 9], [2, 9]]).rect(2, 1, 5, 2).rect(4, 0, 1, 1).rect(0, 9, 10, 1).rect(1, 8, 8, 1);
lighthouse.clear(3, 5, 3, 1).clear(4, 2, 1, 1).clear(4, 7, 1, 1);

// ---- 15x15 ----
const sub = new Canvas(15);
sub.ellipse(7, 9, 7, 4).rect(5, 3, 5, 3).rect(9, 1, 1, 3).rect(9, 1, 3, 1).rect(0, 7, 2, 4).rect(13, 7, 2, 4);
sub.disc(4, 9, 1, 0).disc(7, 9, 1, 0).disc(10, 9, 1, 0).clear(6, 4, 3, 1);

const ship = new Canvas(15);
ship.poly([[0, 10], [15, 10], [12, 14], [3, 14]]).rect(7, 0, 1, 10).poly([[8, 1], [14, 8], [8, 8]]).poly([[7, 2], [1, 8], [7, 8]]);
ship.clear(3, 11, 1, 1).clear(6, 11, 1, 1).clear(9, 11, 1, 1).clear(12, 11, 1, 1);

const octopus15 = new Canvas(15);
octopus15.ellipse(7, 5.4, 6, 5.4).rect(0, 9, 3, 6).rect(4, 10, 2, 5).rect(9, 10, 2, 5).rect(12, 9, 3, 6).rect(1, 9, 13, 2).rect(6, 10, 3, 4);
octopus15.clear(3, 4, 2, 3).clear(10, 4, 2, 3).rect(4, 5, 1, 1).rect(11, 5, 1, 1).clear(6, 8, 3, 1).clear(2, 13, 1, 2).clear(12, 13, 1, 2);

// ---- 20x20 ----
const bigWhale = new Canvas(20);
bigWhale.ellipse(9, 12, 9, 6.4).poly([[14, 12], [20, 4], [20, 9], [17, 13]]).poly([[14, 12], [20, 20], [20, 15], [17, 12]]);
bigWhale.rect(7, 2, 2, 5).rect(4, 0, 2, 2).rect(10, 0, 2, 2).rect(6, 6, 4, 1);
bigWhale.clear(2, 10, 2, 2).rect(2, 11, 1, 1).clear(3, 15, 6, 1).clear(0, 14, 2, 1);

export default [
  // 5x5
  { en: "Fish", nl: "Vis", color: "#35b6c9", art: art(`...#.\n#.###\n#####\n#.###\n...#.`) },
  { en: "Shell", nl: "Schelp", color: "#f06fb0", art: art(`..#..\n.###.\n#####\n#.#.#\n.###.`) },
  { en: "Crab", nl: "Krab", color: "#e5484d", art: art(`#...#\n#.#.#\n#####\n.###.\n.#.#.`) },
  { en: "Wave", nl: "Golf", color: "#5aa9ff", art: art(`..##.\n.###.\n##.#.\n#####\n#####`) },
  { en: "Anchor", nl: "Anker", color: "#4f6fa8", art: art(`..#..\n#####\n..#..\n#.#.#\n#####`) },
  { en: "Starfish", nl: "Zeester", color: "#ff8f5a", art: art(`..#..\n.###.\n#####\n.###.\n#...#`) },
  { en: "Sailboat", nl: "Zeilbootje", color: "#5aa9ff", art: art(`..#..\n.##..\n.###.\n#####\n.###.`) },
  { en: "Jellyfish", nl: "Kwal", color: "#9b86ff", art: art(`.###.\n#####\n#.#.#\n#.#.#\n.....`) },
  // 10x10
  { en: "Whale", nl: "Walvis", color: "#5aa9ff", art: whale },
  { en: "Sailboat", nl: "Zeilboot", color: "#e5484d", art: sailboat },
  { en: "Jellyfish", nl: "Kwal", color: "#9b86ff", art: jelly },
  { en: "Octopus", nl: "Octopus", color: "#f06fb0", art: octopus },
  { en: "Crab", nl: "Krab", color: "#e5484d", art: crab },
  { en: "Starfish", nl: "Zeester", color: "#ff8f5a", art: star10 },
  { en: "Lighthouse", nl: "Vuurtoren", color: "#e5484d", art: lighthouse },
  { en: "Message in a bottle", nl: "Fles met boodschap", color: "#45c9a0", art: art(`...####...\n....##....\n....##....\n..######..\n.########.\n.########.\n.###.####.\n.########.\n.########.\n..######..`) },
  // 15x15
  { en: "Submarine", nl: "Duikboot", color: "#ffb638", art: sub },
  { en: "Sailing ship", nl: "Zeilschip", color: "#a0764a", art: ship },
  { en: "Big octopus", nl: "Grote octopus", color: "#f06fb0", art: octopus15 },
  // 20x20
  { en: "Humpback whale", nl: "Bultrug", color: "#4f8fe8", art: bigWhale },
];
