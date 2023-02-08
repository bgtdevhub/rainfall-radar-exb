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

// generate tile ID
export const generateTileID = (date: number): string => `base-${date}`;

const roundDownTo = (roundTo: number) => (x: number) =>
  Math.floor(x / roundTo) * roundTo;

const roundUpTo = (roundTo: number) => (x: number) =>
  Math.ceil(x / roundTo) * roundTo;

// generate round down 10 minutes in unix
export const getRoundDownUnixTs = (): number => {
  const roundDownTo10Minutes = roundDownTo(1000 * 60 * 10);
  const roundDate = roundDownTo10Minutes(new Date().getTime());

  return roundDate / 1000;
};

// generate round up 10 minutes in unix
export const getRoundUpUnixTs = (): number => {
  const roundUpTo10Minutes = roundUpTo(1000 * 60 * 10);
  const roundDate = roundUpTo10Minutes(new Date().getTime());

  return roundDate / 1000;
};

export const findLayers = (
  layers: __esri.Collection<__esri.Layer>,
  toFind: string
): __esri.Layer[] => {
  return layers.filter((y: __esri.Layer) => y.id.includes(toFind)).toArray();
};

export const generateColorLegend = (
  code: string,
  rain = true,
  label = true
) => {
  const colorList = rain ? rainColorCodes[code] : snowColorCodes[code];
  const lowText = rain ? 'Overcast' : 'Light';
  const highText = rain ? 'Hail' : 'Heavy';
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
        {lowText}
      </small>
      {tableRender}
      <small className="text-right text-end text-white align-self-end">
        {highText}
      </small>
    </div>
  );
};
