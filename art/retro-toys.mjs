import { Canvas, art } from "./lib.mjs";

// ---- 10x10 ----
const teddy = new Canvas(10);
teddy.disc(4.5, 3, 2.9).disc(1.8, 0.9, 1.3).disc(7.2, 0.9, 1.3).ellipse(4.5, 7, 3, 2.6).rect(0, 5, 2, 2).rect(8, 5, 2, 2).rect(1, 8, 2, 2).rect(7, 8, 2, 2);
teddy.clear(3, 2, 1, 1).clear(6, 2, 1, 1).clear(4, 4, 2, 1).clear(4, 6, 2, 1);

// ---- 15x15 ----
const tv = new Canvas(15);
tv.rect(1, 4, 13, 10).line(7, 4, 3, 0).line(7, 4, 11, 0).line(8, 4, 12, 0).line(6, 4, 2, 0).clear(2, 5, 8, 8).clear(11, 6, 2, 2).clear(11, 9, 2, 2).rect(3, 14, 2, 1).rect(10, 14, 2, 1);
tv.rect(4, 7, 3, 1).rect(4, 9, 1, 1);

const handheld = new Canvas(15);
handheld.rect(2, 0, 11, 15).clear(4, 2, 7, 5).clear(5, 10, 3, 1).clear(6, 9, 1, 3).clear(10, 9, 1, 1).clear(11, 11, 1, 1).clear(9, 13, 1, 1).clear(11, 13, 1, 1).clear(10, 13, 1, 1);
handheld.rect(5, 3, 2, 1);

const train = new Canvas(15);
train.rect(0, 5, 8, 6).rect(6, 2, 4, 9).rect(1, 2, 2, 3).rect(10, 8, 2, 1).rect(11, 6, 4, 6).rect(0, 11, 15, 1);
train.disc(2, 12.5, 1.6).disc(6, 12.5, 1.6).disc(12.5, 12.5, 1.6).clear(7, 3, 2, 2).clear(12, 7, 2, 2);

// ---- 20x20 ----
const robot = new Canvas(20);
robot.rect(6, 1, 4, 6).rect(9, 0, 1, 1).rect(7, 0, 1, 1).rect(9, 7, 1, 1).rect(4, 8, 6, 8).rect(0, 8, 4, 3).rect(0, 11, 3, 6).rect(5, 16, 4, 4);
robot.clear(7, 3, 1, 2).clear(7, 5, 3, 1).clear(6, 10, 3, 3).rect(7, 11, 1, 1).rect(5, 9, 1, 1);
robot.mirror();
robot.rect(9, 0, 2, 1, 1).clear(9, 8, 2, 3);
robot.rect(9, 1, 2, 7, 1).clear(9, 3, 2, 2).rect(9, 7, 2, 1);
robot.rect(9, 8, 2, 8);

export default [
  // 5x5
  { en: "Kite", nl: "Vlieger", color: "#f06fb0", art: art(`..#..\n.###.\n#####\n.###.\n..#..`) },
  { en: "Yo-yo", nl: "Jojo", color: "#e5484d", art: art(`.###.\n#...#\n#.#.#\n#...#\n.###.`) },
  { en: "Hourglass", nl: "Zandloper", color: "#5aa9ff", art: art(`#####\n.###.\n..#..\n.###.\n#####`) },
  { en: "Toy car", nl: "Speelgoedauto", color: "#e5484d", art: art(`.###.\n#####\n#####\n.#.#.\n.....`) },
  { en: "Robot", nl: "Robot", color: "#8c9ac0", art: art(`..#..\n#####\n#.#.#\n#####\n.#.#.`) },
  { en: "Balloon", nl: "Ballon", color: "#f06fb0", art: art(`.###.\n#####\n#####\n.###.\n..#..`) },
  { en: "Spinning top", nl: "Tol", color: "#ffb638", art: art(`#####\n.###.\n.###.\n..#..\n..#..`) },
  { en: "Beach ball", nl: "Strandbal", color: "#45c9a0", art: art(`.###.\n#.#.#\n#####\n#.#.#\n.###.`) },
  // 10x10
  { en: "Robot", nl: "Robot", color: "#8c9ac0", art: art(`....##....\n..######..\n..#.##.#..\n..######..\n...####...\n.########.\n#.######.#\n#.######.#\n..##..##..\n..##..##..`) },
  { en: "Steam train", nl: "Stoomtrein", color: "#a0764a", art: art(`.##.......\n.##.......\n.##..####.\n##########\n##########\n##########\n.##.##.##.\n.##.##.##.\n..........\n..........`) },
  { en: "Teddy bear", nl: "Knuffelbeer", color: "#b57a4e", art: teddy },
  { en: "Joystick", nl: "Joystick", color: "#e5484d", art: art(`...####...\n...####...\n....##....\n....##....\n....##....\n..######..\n.########.\n##########\n##.####.##\n##########`) },
  { en: "Cassette", nl: "Cassette", color: "#4f8fe8", art: art(`##########\n#........#\n#.##..##.#\n#.##..##.#\n#........#\n##########\n#.######.#\n#.######.#\n##########\n..........`) },
  { en: "Gamepad", nl: "Gamepad", color: "#9b86ff", art: art(`.########.\n##########\n##.####.##\n#..####..#\n##.####.##\n##########\n###....###\n##......##\n..........\n..........`) },
  { en: "Peg top", nl: "Draaitol", color: "#ffb638", art: art(`....##....\n....##....\n.########.\n##########\n.########.\n..######..\n...####...\n....##....\n....##....\n..........`) },
  { en: "Building blocks", nl: "Bouwblokken", color: "#ff8f5a", art: art(`...####...\n...#..#...\n...####...\n####..####\n#..#..#..#\n#..#..#..#\n####..####\n..........\n..........\n..........`) },
  // 15x15
  { en: "Retro TV", nl: "Retro tv", color: "#45c9a0", art: tv },
  { en: "Handheld console", nl: "Handheld console", color: "#9b86ff", art: handheld },
  { en: "Toy train", nl: "Speelgoedtrein", color: "#e5484d", art: train },
  // 20x20
  { en: "Giant robot", nl: "Reuzenrobot", color: "#5aa9ff", art: robot },
];
