import { Canvas, art } from "./lib.mjs";

// ---- 15x15 ----
const bike = new Canvas(15);
bike.ring(3, 10, 3.2, 0.55).ring(11, 10, 3.2, 0.55);
bike.line(3, 10, 7, 10).line(3, 10, 5, 4).line(7, 10, 5, 4).line(5, 4, 10, 5).line(7, 10, 10, 5).line(10, 5, 11, 10);
bike.line(3, 3, 6, 3).line(10, 5, 10, 3).line(10, 3, 12, 3).rect(6, 11, 3, 1);

const canal = new Canvas(15);
canal.rect(0, 6, 15, 9);
for (const hx of [0, 5, 10]) {
  for (const wy of [8, 11]) {
    canal.clear(hx + 1, wy, 1, 2).clear(hx + 3, wy, 1, 2);
  }
}
canal.clear(2, 13, 1, 2).clear(7, 13, 1, 2).clear(12, 13, 1, 2);
canal.rect(0, 5, 5, 1).rect(1, 4, 3, 1).rect(2, 3, 1, 1); // bell gable
canal.rect(5, 5, 5, 1).rect(6, 4, 4, 1).rect(7, 3, 3, 1).rect(8, 2, 2, 1).rect(9, 1, 1, 1); // step gable
canal.rect(10, 5, 5, 1).rect(11, 4, 3, 1).rect(12, 1, 1, 4); // neck gable
canal.clear(4, 6, 1, 9).clear(9, 6, 1, 9); // thin gaps between the houses
canal.rect(4, 14, 1, 1).rect(9, 14, 1, 1);

const mill = new Canvas(15);
mill.poly([[5, 7], [10, 7], [12, 15], [3, 15]]);
mill.rect(6, 5, 3, 2);
for (const [x, y] of [[2, 0], [12, 0]]) mill.line(7, 5, x, y).line(8, 5, x + 1, y);
mill.line(7, 5, 3, 9).line(8, 5, 12, 9).line(6, 5, 2, 1).line(9, 5, 13, 1);
mill.clear(6, 12, 3, 3).clear(6, 9, 3, 1);

const waffle = new Canvas(10);
waffle.disc(4.5, 4.5, 4.7);
for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) if (x % 3 !== 0 && y % 3 !== 0) waffle.set(x, y, 0);

// ---- 20x20 ----
const tulip = new Canvas(20);
tulip.ellipse(9.5, 4.5, 2.6, 4.4).ellipse(6.4, 5.6, 2.7, 4.2).rect(4, 8, 12, 2);
tulip.ellipse(9.5, 7, 4.8, 3.2).rect(9, 10, 2, 10);
tulip.poly([[9, 19], [3, 15], [1, 11], [4, 12], [9, 16]]);
tulip.mirror().rect(9, 10, 2, 10);
tulip.clear(9, 0, 2, 3);

export default [
  // 5x5
  { en: "Clog", nl: "Klomp", color: "#ff8f5a", art: art(`##...\n##...\n#####\n#####\n.###.`) },
  { en: "Cheese", nl: "Kaas", color: "#ffb638", art: art(`....#\n..###\n.##.#\n#####\n#####`) },
  { en: "Mini mill", nl: "Molentje", color: "#5aa9ff", art: art(`#...#\n.#.#.\n..#..\n.###.\n.###.`) },
  { en: "Flag", nl: "Vlaggetje", color: "#ff7a90", art: art(`#####\n#####\n#####\n#....\n#....`) },
  { en: "Stroopwafel", nl: "Stroopwafel", color: "#e0894a", art: art(`.###.\n#.#.#\n#####\n#.#.#\n.###.`) },
  { en: "Herring", nl: "Haring", color: "#35b6c9", art: art(`..##.\n###.#\n#####\n###.#\n..##.`) },
  { en: "Crown", nl: "Kroontje", color: "#ffb638", art: art(`#.#.#\n#####\n#####\n#####\n.....`) },
  { en: "Delft tile", nl: "Delfts tegeltje", color: "#4f8fe8", art: art(`#####\n#...#\n#.#.#\n#...#\n#####`) },
  // 10x10
  { en: "Tulip", nl: "Tulp", color: "#ff7a90", art: art(`..#.##.#..\n..######..\n..######..\n...####...\n....##....\n....##....\n.##.##.##.\n..########\n....##....\n....##....`) },
  { en: "Windmill", nl: "Windmolen", color: "#5aa9ff", art: art(`##......##\n###....###\n.###..###.\n..######..\n...####...\n...####...\n..######..\n..######..\n..##..##..\n..##..##..`) },
  { en: "Canal house", nl: "Grachtenpand", color: "#ff7a90", art: art(`....##....\n...####...\n..######..\n.########.\n##.####.##\n##########\n##.####.##\n##########\n##.####.##\n####..####`) },
  { en: "Delft vase", nl: "Delftse vaas", color: "#4f8fe8", art: art(`..######..\n...####...\n...####...\n..######..\n.########.\n.########.\n.########.\n..######..\n..######..\n.########.`) },
  { en: "Big cheese", nl: "Grote kaas", color: "#ffb638", art: art(`........##\n......####\n....######\n..########\n##########\n#.##.#####\n####...###\n#.########\n##########\n##########`) },
  { en: "Wooden shoe", nl: "Houten schoen", color: "#ff8f5a", art: art(`..........\n###.......\n###.......\n###.......\n####......\n#########.\n##########\n##########\n.########.\n..........`) },
  { en: "Waffle", nl: "Stroopwafel", color: "#e0894a", art: waffle },
  { en: "Fresh herring", nl: "Verse haring", color: "#35b6c9", art: art(`..........\n.....###..\n#...######\n##.#######\n#####.####\n##.#######\n#...######\n.....###..\n..........\n..........`) },
  // 15x15
  { en: "Bicycle", nl: "Fiets", color: "#35b6c9", art: bike },
  { en: "Canal houses", nl: "Grachtenpanden", color: "#e8684f", art: canal },
  { en: "Windmill at work", nl: "Molen aan het werk", color: "#5aa9ff", art: mill },
  // 20x20
  { en: "Big tulip", nl: "Grote tulp", color: "#ff7a90", art: tulip },
];
