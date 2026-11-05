import { emptyUnit, type Unit, type UnitType } from './model';
const photo = (type: UnitType) => '/images/' + type.toLowerCase() + '.svg';
function complete(id: string, stock: string, name: string, type: UnitType, index = 0): Unit {
  const towable = type === 'Trailer' || type === 'RV';
  return { ...emptyUnit(id), stock, name, type, year: 2024 + index % 3, price: type === 'Trailer' ? 6900 + index * 125 : type === 'RV' ? 32900 + index * 200 : type === 'Equipment' ? 42500 + index * 150 : 8200 + index * 75,
    width: type === 'Shed' ? 10 : 7, length: type === 'RV' ? 28 : type === 'Equipment' ? 12 : 16,
    condition: index % 3 === 0 ? 'New' : 'Used', location: index % 4 === 0 ? 'East lot' : 'Main lot',
    gvwr: towable ? 14000 : null, payload: towable ? 9000 : null, axles: towable ? 2 : null,
    hitch: towable ? 'Bumper pull' : 'Not applicable', usage: type === 'Equipment' ? index * 70 : null, photo: photo(type) };
}
export function createSeed(): Unit[] {
  const units: Unit[] = [
    { ...complete('tr-1042', 'TR-1042', '2024 Utility Trailer · 16 ft', 'Trailer'), year: 2024, price: null, location: 'Main lot' },
    { ...complete('rv-2086', 'RV-2086', '2023 Travel Trailer · 28 ft', 'RV'), year: 2023, length: 30, reference: { length: 28 } },
    { ...complete('sh-0314', 'SH-0314', '10 × 16 Lofted Barn', 'Shed'), photo: null },
    { ...complete('eq-0527', 'EQ-0527', 'Compact Track Loader', 'Equipment'), reference: { condition: 'Used' }, usage: 460 },
    { ...complete('tr-1047', 'TR-1047', '2025 Enclosed Trailer · 12 ft', 'Trailer'), year: 2025, length: 12 },
    { ...complete('rv-2091', 'RV-2091', '2024 Camper Van', 'RV'), year: 2024, length: 21, hitch: 'Not applicable', gvwr: null, payload: null, axles: null, usage: 18500 },
  ];
  const types: UnitType[] = ['Trailer','RV','Equipment','Shed'];
  const names = { Trailer: ['Utility Trailer','Enclosed Cargo Trailer','Dump Trailer','Equipment Trailer'], RV: ['Travel Trailer','Fifth Wheel','Touring Trailer','Family Camper'], Equipment: ['Compact Loader','Mini Excavator','Utility Tractor','Skid Steer'], Shed: ['Garden Workshop','Storage Barn','Utility Shed','Lofted Cabin'] };
  for (let i = 6; i < 128; i++) {
    const type = types[i % 4]; const prefix = { Trailer: 'TR', RV: 'RV', Equipment: 'EQ', Shed: 'SH' }[type];
    const stock = `${prefix}-${3000+i}`;
    const unit = complete(stock.toLowerCase(), stock, `${2024+i%3} ${names[type][Math.floor(i/4)%4]}`, type, i);
    if (i < 18) {
      if (i % 3 === 0) unit.price = null;
      else if (i % 3 === 1) unit.width = null;
      else unit.year = null;
    } else if (i < 24) {
      unit.reference = { length: unit.length! - 2 };
    }
    units.push(unit);
  }
  return units;
}

