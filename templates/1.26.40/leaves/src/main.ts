// Entry point. Each import registers one concern: the queue that keeps every
// leaf's distance current, rotting on random ticks, the persistent flag on
// player-placed leaves, the drops a break produces, and the leaves that drift
// down out of the canopy.
import "./queue.js";
import "./decay.js";
import "./persistence.js";
import "./drops.js";
import "./particles.js";
