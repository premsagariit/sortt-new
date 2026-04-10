import {
  isAddressInOperatingAreas,
  normalizeAreaValue,
  parseOperatingAreas,
} from '../utils/availability';

describe('availability address matching', () => {
  it('parses operating areas from multiple delimiters', () => {
    expect(parseOperatingAreas('Madhapur; Gachibowli, Kondapur | Hitech City')).toEqual([
      'Madhapur',
      'Gachibowli',
      'Kondapur',
      'Hitech City',
    ]);
  });

  it('normalizes punctuation and spacing for area values', () => {
    expect(normalizeAreaValue('  Madhapur,  Hyderabad  ')).toBe('madhapur hyderabad');
    expect(normalizeAreaValue('Hi-Tech   City')).toBe('hi tech city');
  });

  it('matches when locality is exact operating area', () => {
    expect(
      isAddressInOperatingAreas('Madhapur', 'Flat 301, Road 36, Hyderabad', ['Madhapur'])
    ).toBe(true);
  });

  it('matches when detailed address contains operating area token', () => {
    expect(
      isAddressInOperatingAreas(
        'Hyderabad',
        'Flat 12B, Silicon Heights, Ayyappa Society, Madhapur, Hyderabad',
        ['Madhapur']
      )
    ).toBe(true);
  });

  it('does not match when operating area is missing from locality and address', () => {
    expect(
      isAddressInOperatingAreas(
        'Kukatpally',
        'Flat 22, Vivekananda Nagar Colony, Kukatpally, Hyderabad',
        ['Madhapur']
      )
    ).toBe(false);
  });

  it('returns false for empty operating areas', () => {
    expect(isAddressInOperatingAreas('Madhapur', 'Madhapur, Hyderabad', [])).toBe(false);
  });
});
