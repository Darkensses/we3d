// Stadium metadata, carousel-slot order. Source: psx-we2002/STADIUM_MAPPING.md.
// The random carousel slot (16) has no GRDM mesh and is omitted.
// id = disc-order index (also the SELECT.BIN table slot index).

export const STADIUMS = [
  { slot: 1,  id: 0x0e, letter: 'O',  file: 'GRDM_O.BIN',  name: 'Olympic Stadium, Sydney',        issName: 'Key Square Stadium' },
  { slot: 2,  id: 0x0f, letter: 'V',  file: 'GRDM_V.BIN',  name: 'King Baudouin Stadium, Brussels', issName: 'Royal Palace Stadium' },
  { slot: 3,  id: 0x00, letter: 'D',  file: 'GRDM_D.BIN',  name: 'Stade de France, Saint-Denis',    issName: 'Flying Disk Stadium' },
  { slot: 4,  id: 0x01, letter: 'F',  file: 'GRDM_F.BIN',  name: 'Olympic Stadium, Berlin',         issName: 'Twin Towers Stadium' },
  { slot: 5,  id: 0x02, letter: 'J',  file: 'GRDM_J.BIN',  name: 'Wembley, London',                 issName: 'Apex Stadium' },
  { slot: 6,  id: 0x03, letter: 'S',  file: 'GRDM_S.BIN',  name: 'San Siro, Milano',                issName: 'White Stadium' },
  { slot: 7,  id: 0x04, letter: 'M',  file: 'GRDM_M.BIN',  name: 'Olympic Stadium, Munchen',        issName: 'Imperial Stadium' },
  { slot: 8,  id: 0x05, letter: 'A',  file: 'GRDM_A.BIN',  name: 'Amsterdam Arena',                 issName: 'Arena Stadium' },
  { slot: 9,  id: 0x06, letter: 'P',  file: 'GRDM_P.BIN',  name: 'Parc des Princes, Paris',         issName: 'Masters Stadium' },
  { slot: 10, id: 0x07, letter: 'C',  file: 'GRDM_C.BIN',  name: 'Estadio Nacional, Santiago',      issName: 'Pacific Plaza Stadium' },
  { slot: 11, id: 0x08, letter: 'H',  file: 'GRDM_H.BIN',  name: 'Saitama Stadium',                 issName: 'National Stadium' },
  { slot: 12, id: 0x09, letter: 'T',  file: 'GRDM_T.BIN',  name: 'Old Trafford, Manchester',        issName: 'Legends Stadium' },
  { slot: 13, id: 0x0a, letter: 'GJ', file: 'GRDM_GJ.BIN', name: 'International Stadium, Yokohama',  issName: 'International Stadium' },
  { slot: 14, id: 0x0b, letter: 'MJ', file: 'GRDM_MJ.BIN', name: 'Nagai Stadium, Osaka',            issName: 'Arc Stadium' },
  { slot: 15, id: 0x0c, letter: 'RJ', file: 'GRDM_RJ.BIN', name: 'Olympic Stadium, Tokyo',          issName: 'Oval Stadium' },
  { slot: 'training', id: 0x0d, letter: 'I', file: 'GRDM_I.BIN', name: 'Training Stadium',          issName: 'Club House Stadium' },
  { slot: 'hidden',   id: 0x10, letter: 'B', file: 'GRDM_B.BIN', name: 'Hidden Stadium',            issName: 'Hidden Stadium' },
];

export function stadiumById(id) {
  return STADIUMS.find((s) => s.id === id);
}
