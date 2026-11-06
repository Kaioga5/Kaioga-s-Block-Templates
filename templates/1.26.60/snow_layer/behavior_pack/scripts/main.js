// Entry point. Four concerns: piling up when snow is placed on snow, growing
// while snow falls on it, melting away in the light, which also owns what a
// shovel digs out of it, and falling when the block under it goes.
// Weather tracking is imported first so it is listening before the first
// random tick asks it anything
import "./weather.js";
import "./stacking.js";
import "./melt.js";
import "./falling.js";
