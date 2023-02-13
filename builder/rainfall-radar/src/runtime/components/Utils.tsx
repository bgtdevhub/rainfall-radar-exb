// https://oms.wff.ch/calc.htm
// https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#ECMAScript_.28JavaScript.2FActionScript.2C_etc..29
// longitude to X google map tile

import { React } from 'jimu-core';
import { rainColorCodes, snowColorCodes } from '../../config';
import '../widget.css';

export const lon2tile = (lon: number, zoom: number): number => {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
};

// latitude to Y google map tile
export const lat2tile = (lat: number, zoom: number): number => {
  return Math.floor(
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
      ) /
        Math.PI) /
      2) *
      Math.pow(2, zoom)
  );
};

/**
 * generate tile ID based on date
 * @param date date
 * @returns
 */
export const generateTileID = (date: number): string =>
  `rainfall-radar-base-${date}`;

/**
 * find layer helper
 * @param layers layer collections
 * @param toFind wildcard to find
 * @returns
 */
export const findLayers = (
  layers: __esri.Collection<__esri.Layer>,
  toFind: string
): __esri.Layer[] => {
  return layers.filter((y: __esri.Layer) => y.id.includes(toFind)).toArray();
};

/**
 * generic round down
 * @param roundTo number to round down to
 * @returns
 */
const roundDownTo = (roundTo: number) => (x: number) =>
  Math.floor(x / roundTo) * roundTo;

/**
 * generic round up
 * @param roundTo number to round up to
 * @returns
 */
const roundUpTo = (roundTo: number) => (x: number) =>
  Math.ceil(x / roundTo) * roundTo;

/**
 * generate round down 10 minutes in unix
 * @returns
 */
export const getRoundDownUnixTs = (): number => {
  const roundDownTo10Minutes = roundDownTo(1000 * 60 * 10);
  const roundDate = roundDownTo10Minutes(new Date().getTime());

  return roundDate / 1000;
};

/**
 * generate round up 10 minutes in unix
 * @returns
 */
export const getRoundUpUnixTs = (): number => {
  const roundUpTo10Minutes = roundUpTo(1000 * 60 * 10);
  const roundDate = roundUpTo10Minutes(new Date().getTime());

  return roundDate / 1000;
};

const appendZero = (value: number): string => {
  return value < 10 ? `0${value}` : `${value}`;
};

export const getBOMPath = (unixts: number): string => {
  const d = new Date(unixts * 1000);
  const year = d.getFullYear();
  const month = appendZero(d.getMonth() + 1);
  const date = appendZero(d.getDate());
  const hour = appendZero(d.getHours());
  const minutes = appendZero(d.getMinutes());
  return `${year}${month}${date}${hour}${minutes}`;
};

/**
 * Generate Colour scheme for Rainviewer
 * @param code colour code
 * @param rain rain data or not
 * @param label need label or not
 * @returns
 */
export const generateColorLegend = (
  code: string,
  rain = true,
  label = true
) => {
  const colorList = rain ? rainColorCodes[code] : snowColorCodes[code];
  const type = rain ? 1 : 2;

  const renderTd = () => {
    return colorList.map((c: string) => {
      return <td key={`${code}-${c}`} style={{ backgroundColor: c }}></td>;
    });
  };

  const tableRender = (
    <table className="table-color">
      <tr>{renderTd()}</tr>
    </table>
  );

  if (!label) {
    return tableRender;
  }
  return (
    <div className={`color-grid color-grid-${type}`}>
      <small className="text-left text-start text-white align-self-end">
        Light
      </small>
      {tableRender}
      <small className="text-right text-end text-white align-self-end">
        Heavy
      </small>
    </div>
  );
};
