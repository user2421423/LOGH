'use strict';
const PROFILE_KEY = 'galactic-command-officers';
function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {};
  } catch (e) {
    return {};
  }
}
function saveProfile(p) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch (e) {
    toast('This browser could not save your command records.');
  }
}
function save() {
  if (game.phase !== game.player) return;
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(E.exportProfile(game, loadProfile())));
    localStorage.setItem('galactic-command-hex-v2', JSON.stringify(game, (k, val) => k === '_plan' || k === '_planTurn' ? undefined : val));
    saveOk = true;
  } catch (e) {
    saveOk = false;
    toast('This browser could not save progress. Keep this tab open.');
  }
}
function getSave() {
  try {
    const g = JSON.parse(localStorage.getItem('galactic-command-hex-v2'));
    if (g?.version === 2 && g.tiles?.length === g.cols * g.rows && g.units && g.stations && E.FACTIONS[g.player])
      return E.migrateSave(g);
  } catch (e) {}
  return null;
}
