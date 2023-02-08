import { React } from 'jimu-core';
import { Slider } from 'jimu-ui';
import { CalciteButton } from 'calcite-components';
import { RainviewerItem } from '../../../config';

import './index.css';

const { useLayoutEffect, useRef } = React;

interface TimeSliderProps {
  timePath: RainviewerItem;
  setTimePath: Function;
  play: boolean;
  setPlay: Function;
  timePathList: RainviewerItem[];
}

const renderTimePath = (time: number): string => {
  return new Date(time * 1000).toString();
};

const MapDatepicker = ({
  timePath,
  setTimePath,
  play,
  setPlay,
  timePathList
}: TimeSliderProps): JSX.Element => {
  const tpIndex =
    timePathList.length === 1
      ? 0
      : timePathList.findIndex((tp) => tp.time === timePath.time);

  const tpIndexRef = useRef(tpIndex);
  const frame = useRef(0);

  useLayoutEffect(() => {
    let intervalPlay: NodeJS.Timer;
    const fps = 7;

    const playProcess = () => {
      intervalPlay = setTimeout(() => {
        tpIndexRef.current =
          tpIndexRef.current === timePathList.length - 1
            ? 0
            : tpIndexRef.current + 1;
        setTimePath(timePathList[tpIndexRef.current]);
        frame.current = requestAnimationFrame(playProcess);
      }, 1000 / fps);
    };

    if (play) {
      frame.current = requestAnimationFrame(playProcess);
    } else {
      clearTimeout(intervalPlay);
      cancelAnimationFrame(frame.current);
    }

    return () => {
      clearTimeout(intervalPlay);
      cancelAnimationFrame(frame.current);
    };
  }, [play, setTimePath, timePathList]);

  // toggle play pause
  const onTogglePlay = () => {
    setPlay(!play);
  };

  const onTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTimePath(timePathList[e.target.valueAsNumber]);
    tpIndexRef.current = e.target.valueAsNumber;
  };

  const getTextColor = () => {
    if (timePath.path.includes('nowcast_')) return 'green';
    if (timePathList.length !== 1 && timePath.time !== timePathList[12].time)
      return 'black';
    return 'blue';
  };

  return (
    <div className="date-grid">
      <p
        style={{ color: `${getTextColor()}` }}
        className="date-text"
        aria-label="Date Text"
      >
        {renderTimePath(timePath.time)}
      </p>
      <CalciteButton
        aria-label="Play Pause"
        iconStart={play ? 'pause-f' : 'play-f'}
        round
        onClick={onTogglePlay}
        // disabled={prevDisabled}
        className="play-button"
      ></CalciteButton>
      <Slider
        aria-label="Time Slider"
        className="time-slider"
        max={timePathList.length - 1}
        min={0}
        step={1}
        defaultValue={tpIndexRef.current}
        value={tpIndexRef.current}
        onChange={onTimeChange}
      />
    </div>
  );
};

export default MapDatepicker;
