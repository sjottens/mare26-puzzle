import { Canvas, art } from "./lib.mjs";

// ---- 10x10 ----
const pizza = new Canvas(10);
pizza.poly([[0, 0], [10, 0], [5, 10]]).rect(0, 0, 10, 2);
pizza.disc(3.5, 3.6, 0.9, 0).disc(6.5, 3.6, 0.9, 0).disc(4.8, 6.2, 0.8, 0).clear(0, 2, 1, 1).clear(9, 2, 1, 1);

const cupcake = new Canvas(10);
cupcake.ellipse(4.5, 3.6, 4.4, 2.6).rect(4, 0, 2, 1).poly([[0.5, 6], [8.5, 6], [7.5, 10], [1.5, 10]]);
cupcake.clear(3, 7, 1, 3).clear(6, 7, 1, 3).clear(1, 5, 1, 1).clear(8, 5, 1, 1);

const cone = new Canvas(10);
cone.disc(4.5, 3.8, 4.5).poly([[0.5, 6.5], [8.5, 6.5], [4.5, 10]]).clear(3, 8, 1, 1).clear(5, 8, 1, 1).clear(4, 9, 1, 1);
cone.clear(2, 2, 1, 1);

const carrot = new Canvas(10);
carrot.poly([[1.5, 3], [7.5, 3], [4.5, 10]]).line(4.5, 3, 1.5, 0).line(4.5, 3, 4.5, 0).line(4.5, 3, 7.5, 0).line(4, 3, 2, 0).line(5, 3, 7, 0);
carrot.clear(3, 5, 1, 1).clear(5, 7, 1, 1).clear(4, 4, 1, 1);

const banana = new Canvas(10);
banana.disc(4.5, 4.5, 4.7).disc(6.6, 2.6, 4.3, 0).rect(7, 0, 2, 2).clear(0, 8, 2, 2).clear(3, 9, 6, 1);

const strawberry = new Canvas(10);
strawberry.poly([[0.5, 2.5], [8.5, 2.5], [4.5, 10]]).ellipse(4.5, 3.6, 4.3, 2.6).rect(3, 0, 4, 1).rect(4, 0, 2, 2);
strawberry.clear(2, 4, 1, 1).clear(4, 4, 1, 1).clear(6, 4, 1, 1).clear(3, 6, 1, 1).clear(5, 6, 1, 1).clear(4, 8, 1, 1);

const donut = new Canvas(10);
donut.disc(4.5, 4.5, 4.6).disc(4.5, 4.5, 1.7, 0).clear(2, 2, 1, 1).clear(6, 2, 1, 1).clear(2, 7, 1, 1).clear(7, 6, 1, 1);


// ---- 15x15 ----
const cake = new Canvas(15);
cake.rect(1, 11, 13, 4).rect(3, 7, 9, 4).rect(5, 4, 5, 3).rect(7, 1, 1, 3).rect(7, 0, 1, 1);
cake.clear(2, 12, 1, 1).clear(5, 12, 1, 1).clear(9, 12, 1, 1).clear(12, 12, 1, 1).clear(4, 8, 1, 1).clear(7, 8, 1, 1).clear(10, 8, 1, 1);
cake.clear(2, 11, 1, 1).clear(6, 11, 1, 1).clear(10, 11, 1, 1).clear(13, 11, 1, 1);

const cup = new Canvas(15);
cup.rect(2, 6, 9, 8).ring(11.5, 9.5, 2.6, 0.6).clear(3, 7, 7, 1).rect(3, 8, 7, 1, 0);
cup.rect(1, 14, 12, 1).clear(4, 8, 5, 5);
cup.rect(4, 8, 5, 1);
cup.line(4, 4, 5, 2).line(7, 4, 8, 2).line(10, 4, 9, 2).rect(4, 1, 1, 1).rect(8, 1, 1, 1);

const pineapple = new Canvas(15);
pineapple.ellipse(7, 9, 5.6, 5.6);
for (let y = 0; y < 15; y++) for (let x = 0; x < 15; x++) if ((x + y) % 3 === 0 && Math.hypot((x - 7) / 5.6, (y - 9) / 5.6) < 0.85) pineapple.set(x, y, 0);
pineapple.line(7, 3, 2, 0).line(7, 3, 3, 0).line(7, 3, 7, 0).line(7, 3, 11, 0).line(7, 3, 12, 0).line(6, 3, 5, 0).line(8, 3, 9, 0).rect(6, 2, 3, 2);

// ---- 20x20 ----
const apple = new Canvas(20);
apple.disc(6.6, 11.5, 6.8).disc(12.4, 11.5, 6.8).rect(8, 5, 4, 3).clear(9, 4, 2, 2).rect(9, 1, 2, 4).ellipse(13.5, 3.2, 3.2, 1.7);
apple.clear(9, 18, 2, 2).clear(3, 8, 2, 2);

export default [
  // 5x5
  { en: "Apple", nl: "Appel", color: "#e5484d", art: art(`..#..\n.####\n#####\n#####\n.###.`) },
  { en: "Cherries", nl: "Kersen", color: "#e5484d", art: art(`..#..\n.###.\n#####\n##.##\n##.##`) },
  { en: "Cupcake", nl: "Cupcake", color: "#f06fb0", art: art(`.###.\n#####\n#.#.#\n.###.\n.###.`) },
  { en: "Ice cream", nl: "IJsje", color: "#ffb08f", art: art(`.###.\n#####\n.###.\n.###.\n..#..`) },
  { en: "Fried egg", nl: "Spiegelei", color: "#ffb638", art: art(`.###.\n#####\n#...#\n#####\n.###.`) },
  { en: "Lollipop", nl: "Lolly", color: "#9b86ff", art: art(`.###.\n#.#.#\n#####\n.###.\n..#..`) },
  { en: "Cookie", nl: "Koekje", color: "#b57a4e", art: art(`.###.\n#.#.#\n#####\n##.##\n.###.`) },
  { en: "Pear", nl: "Peer", color: "#8fd14f", art: art(`..#..\n..#..\n.###.\n#####\n.###.`) },
  // 10x10
  { en: "Pizza slice", nl: "Pizzapunt", color: "#ff8f5a", art: art(`##########
##########
.########.
.##.##.##.
..######..
..##.###..
...####...
...##.#...
....##....
....##....`) },
  { en: "Cupcake", nl: "Cupcake", color: "#f06fb0", art: cupcake },
  { en: "Ice cream cone", nl: "IJshoorntje", color: "#ffb08f", art: art(`..######..
.########.
##.#######
##########
.########.
##########
.########.
..######..
...####...
....##....`) },
  { en: "Carrot", nl: "Wortel", color: "#ff8f2e", art: art(`.#.#..#.#.
...####...
...####...
..######..
..######..
..##.###..
...####...
...####...
....##....
....##....`) },
  { en: "Banana", nl: "Banaan", color: "#ffb638", art: art(`.......##.
......###.
.....####.
....####..
...####...
..####....
.####.....
#####.....
.######...
..#######.`) },
  { en: "Strawberry", nl: "Aardbei", color: "#e5484d", art: strawberry },
  { en: "Donut", nl: "Donut", color: "#f06fb0", art: donut },
  { en: "Watermelon", nl: "Watermeloen", color: "#45c9a0", art: art(`##########
##########
#.##.##.##
##########
.########.
.########.
..######..
...####...
..........
..........`) },
  // 15x15
  { en: "Birthday cake", nl: "Verjaardagstaart", color: "#f06fb0", art: cake },
  { en: "Coffee cup", nl: "Koffiekopje", color: "#a0764a", art: cup },
  { en: "Pineapple", nl: "Ananas", color: "#ffb638", art: pineapple },
  // 20x20
  { en: "Big apple", nl: "Grote appel", color: "#e5484d", art: apple },
];
