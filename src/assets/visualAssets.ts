import anaInicioMedioBase64 from './anaInicioMedioBase64';
import anaInicioExactBase64 from './anaInicioExactBase64';
import anaAvatarBase64 from './anaAvatarBase64';
import fenixLogoUrl from './fenix-phoenix.svg';

const anaInicioBase64 = anaInicioMedioBase64.startsWith('UklGR')
  ? anaInicioMedioBase64
  : anaInicioExactBase64;

export const anaVertical = `data:image/webp;base64,${anaInicioBase64}`;
export const anaAvatar = `data:image/webp;base64,${anaAvatarBase64}`;
export const fenixLogo = fenixLogoUrl;
