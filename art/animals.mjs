import { Canvas, art, scale } from "./lib.mjs";

// ---- 10x10 ----
const cat = new Canvas(10);
cat.rect(1, 3, 8, 6).poly([[1, 3], [1, 0], [4, 3]]).poly([[9, 3], [9, 0], [6, 3]]);
cat.clear(2, 5, 2, 1).clear(6, 5, 2, 1).clear(4, 7, 2, 1);

const owl = new Canvas(10);
owl.ellipse(4.5, 5.5, 4.3, 4.3).rect(1, 0, 2, 3).rect(7, 0, 2, 3);
owl.clear(1, 3, 3, 3).clear(6, 3, 3, 3).rect(2, 4, 1, 1).rect(7, 4, 1, 1).clear(4, 5, 2, 1);
owl.rect(4, 6, 2, 1).clear(3, 8, 1, 2).clear(6, 8, 1, 2);

const penguin = new Canvas(10);
penguin.ellipse(4.5, 5, 3.8, 4.6).rect(3, 1, 4, 2).clear(3, 2, 1, 1).clear(6, 2, 1, 1);
penguin.ellipse(4.5, 6.2, 2, 2.9, 0).rect(2, 9, 2, 1).rect(6, 9, 2, 1).rect(0, 4, 1, 3).rect(9, 4, 1, 3);
penguin.rect(4, 3, 2, 1, 0).rect(4, 3, 2, 1);

const elephant10 = new Canvas(10);
elephant10.rect(2, 2, 6, 4).rect(0, 3, 3, 4).rect(2, 6, 1, 3).rect(4, 6, 1, 3).rect(7, 6, 1, 3).rect(0, 7, 1, 3).rect(8, 1, 1, 1);
elephant10.clear(1, 3, 1, 1);

const turtle = new Canvas(10);
turtle.ellipse(4.5, 5, 3.6, 3.2).rect(4, 0, 2, 2).rect(0, 4, 2, 2).rect(8, 4, 2, 2).rect(1, 8, 2, 2).rect(7, 8, 2, 2);
turtle.clear(3, 4, 1, 1).clear(6, 4, 1, 1).clear(4, 6, 2, 1);

const rabbit = new Canvas(10);
rabbit.rect(2, 0, 2, 5).rect(6, 0, 2, 5).ellipse(4.5, 6, 3.6, 3.2).clear(3, 5, 1, 1).clear(6, 5, 1, 1);

const butterfly = new Canvas(10);
butterfly.ellipse(2.4, 3, 2.5, 3).ellipse(2.4, 7, 2, 2.4).mirror().rect(4, 1, 2, 8).clear(1, 2, 1, 1).clear(8, 2, 1, 1).clear(1, 7, 1, 1).clear(8, 7, 1, 1);

const ladybug = new Canvas(10);
ladybug.disc(4.5, 5.5, 4.4).rect(3, 0, 4, 2).clear(3, 0, 1, 1).clear(6, 0, 1, 1).clear(4, 2, 2, 8).clear(2, 4, 1, 2).clear(7, 4, 1, 2).clear(2, 7, 1, 1).clear(7, 7, 1, 1);

const fish10 = new Canvas(10);
fish10.ellipse(5.5, 5, 3.6, 3).poly([[0, 1], [3, 5], [0, 9]]).clear(7, 4, 1, 1).clear(4, 5, 1, 1);

// ---- 15x15 ----
const elephant = new Canvas(15);
elephant.rect(3, 4, 10, 6).ellipse(4, 6, 3.5, 3.5).rect(1, 6, 2, 8).rect(0, 12, 2, 2).rect(4, 10, 2, 5).rect(10, 10, 2, 5).rect(7, 10, 2, 5);
elephant.clear(3, 5, 1, 1).rect(12, 3, 2, 2).clear(6, 8, 2, 1).clear(4, 6, 2, 2).rect(4, 7, 1, 1);

const owl15 = new Canvas(15);
owl15.ellipse(7, 8, 6, 6.4).rect(1, 0, 3, 5).rect(11, 0, 3, 5).mirror();
owl15.clear(2, 5, 4, 4).clear(9, 5, 4, 4).rect(3, 6, 2, 2).rect(10, 6, 2, 2).clear(7, 9, 1, 1).rect(6, 9, 3, 2).clear(7, 9, 1, 1);
owl15.clear(4, 12, 1, 3).clear(10, 12, 1, 3).rect(3, 14, 3, 1).rect(9, 14, 3, 1);

const turtle15 = new Canvas(15);
turtle15.ellipse(7, 8, 5.5, 4.6).rect(6, 1, 3, 3).rect(1, 6, 3, 3).rect(11, 6, 3, 3).rect(2, 12, 3, 3).rect(10, 12, 3, 3).rect(6, 12, 3, 2);
turtle15.clear(5, 6, 2, 2).clear(8, 6, 2, 2).clear(6, 9, 3, 1).clear(4, 10, 1, 1).clear(10, 10, 1, 1);

// ---- 20x20 ----
const lion = new Canvas(20);
lion.disc(9.5, 10, 9.4).clear(4, 4, 12, 12);
lion.disc(9.5, 10, 6.6).clear(6, 7, 2, 2).clear(12, 7, 2, 2);
lion.rect(9, 11, 2, 2, 0).rect(8, 12, 4, 1, 0).rect(9, 13, 2, 2, 0).rect(7, 15, 2, 1, 0).rect(11, 15, 2, 1, 0);
lion.rect(6, 2, 2, 2, 1).rect(12, 2, 2, 2, 1);
lion.mirror();

export default [
  // 5x5
  { en: "Cat", nl: "Kat", color: "#ff9a5a", art: art(`#...#\n#####\n#.#.#\n#####\n.###.`) },
  { en: "Bear", nl: "Beer", color: "#b57a4e", art: art(`##.##\n#####\n#.#.#\n#...#\n.###.`) },
  { en: "Frog", nl: "Kikker", color: "#45c9a0", art: art(`.#.#.\n#####\n#.#.#\n#####\n#...#`) },
  { en: "Chick", nl: "Kuiken", color: "#ffb638", art: art(`..#..\n.###.\n#####\n.###.\n.#.#.`) },
  { en: "Duck", nl: "Eend", color: "#ffb638", art: art(`.##..\n.###.\n..###\n#####\n.###.`) },
  { en: "Rabbit", nl: "Konijn", color: "#f06fb0", art: art(`.#.#.\n.#.#.\n#####\n#.#.#\n.###.`) },
  { en: "Butterfly", nl: "Vlinder", color: "#9b86ff", art: art(`#...#\n##.##\n#####\n##.##\n#...#`) },
  { en: "Owl", nl: "Uil", color: "#a0764a", art: art(`#.#.#\n#####\n#.#.#\n.###.\n.#.#.`) },
  // 10x10
  { en: "Cat face", nl: "Kattenkop", color: "#ff9a5a", art: cat },
  { en: "Owl", nl: "Uil", color: "#a0764a", art: scale(art(`#.#.#
#####
#.#.#
.###.
.#.#.`), 2) },
  { en: "Penguin", nl: "Pinguïn", color: "#4f6fa8", art: penguin },
  { en: "Elephant", nl: "Olifant", color: "#8c9ac0", art: art(`..######..
##########
##########
##.####.##
##########
..######..
...####...
...####...
...####...
...##.##..`) },
  { en: "Turtle", nl: "Schildpad", color: "#45c9a0", art: turtle },
  { en: "Bunny", nl: "Haasje", color: "#f06fb0", art: rabbit },
  { en: "Ladybug", nl: "Lieveheersbeestje", color: "#e5484d", art: ladybug },
  { en: "Goldfish", nl: "Goudvis", color: "#ff8f5a", art: fish10 },
  // 15x15
  { en: "Elephant", nl: "Olifant", color: "#8c9ac0", art: elephant },
  { en: "Wise owl", nl: "Wijze uil", color: "#a0764a", art: owl15 },
  { en: "Sea turtle", nl: "Zeeschildpad", color: "#45c9a0", art: turtle15 },
  // 20x20
  { en: "Lion", nl: "Leeuw", color: "#ffa62e", art: lion },
];
