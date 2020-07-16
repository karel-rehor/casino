const craps = require('./craps');

test('roll is between 2 and 12', () => {
   craps.roll().then(() => {
      expect(craps.rolled).toBeGreaterThanOrEqual(2);
      expect(craps.rolled).toBeLessThanOrEqual(12);
   })
});



