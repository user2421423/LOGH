/* Galactic Command standing-order UI state. */
(function (root) {
  'use strict';
  let activeUnitId = null;
  root.GalacticOrdersUI = {
    begin(id) {
      activeUnitId = id;
      return id;
    },
    cancel() {
      activeUnitId = null;
    },
    active() {
      return activeUnitId;
    },
    targeting(id) {
      return activeUnitId != null && (id == null || activeUnitId === id);
    },
    label(unit) {
      return unit?.destination ? 'Change course' : 'Set course';
    },
    detail(unit) {
      return unit?.destination
        ? `Destination [${unit.destination.c},${unit.destination.r}] · moves automatically at turn start`
        : 'Choose a distant sector · G';
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
