import isNumber from 'is-number';
const observed={dependency:'is-number',version:'7.0.0',numeric:isNumber('42'),nonnumeric:isNumber('CEREBRO')};
console.log('CEREBRO_CAPABILITY_PROBE='+JSON.stringify(observed));
if(observed.numeric!==true||observed.nonnumeric!==false)process.exit(41);
