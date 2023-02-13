import { React, AllWidgetProps } from 'jimu-core';
import { JimuMapViewComponent, JimuMapView } from 'jimu-arcgis';
import WebTileLayer from 'esri/layers/WebTileLayer';
import reactiveUtils from 'esri/core/reactiveUtils';
import { Alert, Loading } from 'jimu-ui';
import { IMConfig, RainviewerItem } from '../config';
import {
  findLayers,
  generateColorLegend,
  generateTileID,
  getBOMPath,
  getRoundDownUnixTs,
  getRoundUpUnixTs
} from './components/Utils';

import './widget.css';
import TimeSlider from './components/TimeSlider';

const { useEffect, useRef, useState, useCallback } = React;

const Widget = (props: AllWidgetProps<IMConfig>) => {
  // User Input Parameters
  const dateToday = getRoundDownUnixTs();
  const initialTimePath = {
    time: dateToday,
    path: `v2/radar/${dateToday}`
  };

  const {
    // tileURL, // Nearmap Tile API URL base
    coverageURL, // Rainviewer Coverage API,
    colorScheme, // color scheme
    playOnLoad, // play on load
    opacity,
    relativeTime, // relative or exact time
    dataSource // data source for query
  } = props.config;

  const [timePath, setTimePath] = useState<RainviewerItem>(initialTimePath);
  const [timePathList, setTimePathList] = useState<RainviewerItem[]>([
    initialTimePath
  ]);
  const [firstLoad, setFirstLoad] = useState<boolean>(true);
  const [play, setPlay] = useState<boolean>(playOnLoad);
  const [mapLoad, setMapLoad] = useState<boolean>(false);

  const jmvObjRef = useRef<JimuMapView>(null);
  const pastTimePathRef = useRef<RainviewerItem>(null);

  // BOM API
  // https://api.weather.bom.gov.au/v1/rainradar/tiles/202302030250/9/469/307.png

  // generate web tile layer
  const generateWebTileLayer = useCallback(
    (tPath: RainviewerItem): WebTileLayer => {
      const id = generateTileID(tPath.time);

      const urlTemplate =
        dataSource === '1'
          ? `https://tilecache.rainviewer.com/${tPath.path}/256/{z}/{x}/{y}/${colorScheme}/1_0.png`
          : `https://api.weather.bom.gov.au/v1/rainradar/tiles/${tPath.path}/{z}/{y}/{x}.png`;

      const copyright =
        dataSource === '1'
          ? '<a href="https://www.rainviewer.com/api.html">Rainviewer</a>'
          : '<a href="http://www.bom.gov.au/">Bureau of Meteorology Australia</a>';

      // Create a WebTileLayer for Nearmap imagery.
      // We are using tileinfo we created earlier.
      const wtl = new WebTileLayer({
        urlTemplate,
        copyright,
        title: `Rainfall Radar for ${id}`,
        listMode: 'hide',
        visible: false,
        opacity,
        id
      });

      wtl.on('layerview-create-error', () => {
        wtl.refresh();
      });

      return wtl;
    },
    [colorScheme, dataSource, opacity]
  );

  const loadMapTask = useCallback(
    (tPath: RainviewerItem): void => {
      if (jmvObjRef.current !== null) {
        const newMapLayer = generateWebTileLayer(tPath);
        jmvObjRef.current.view.map.add(newMapLayer, 0);
      }
    },
    [generateWebTileLayer]
  );

  // remove all map layers
  const mapCleanupTask = useCallback((): void => {
    if (jmvObjRef.current !== null) {
      const oldLayers = findLayers(
        jmvObjRef.current.view.map.layers,
        'rainfall-radar-base-'
      );
      jmvObjRef.current.view.map.removeMany(oldLayers);
    }
  }, []);

  // show or hide map
  const showHideMapTask = (tPath: RainviewerItem) => {
    if (jmvObjRef.current !== null) {
      let oldLayers: __esri.Layer[] = [];

      const newLayers = findLayers(
        jmvObjRef.current.view.map.layers,
        `${tPath.time}`
      );

      if (
        pastTimePathRef.current &&
        pastTimePathRef.current.time !== tPath.time
      ) {
        oldLayers = findLayers(
          jmvObjRef.current.view.map.layers,
          `${pastTimePathRef.current.time}`
        );
      }

      if (newLayers.length !== 0) {
        newLayers[0].listMode = 'show';
        newLayers[0].visible = true;
        if (oldLayers.length !== 0) {
          setTimeout(() => {
            // delayHideRef.current = requestAnimationFrame(() => {
            oldLayers[0].listMode = 'hide';
            oldLayers[0].visible = false;
            // });
          }, 80);
        }
      }
    }
  };

  const activeViewChangeHandler = (jmvObj: JimuMapView) => {
    jmvObjRef.current = jmvObj;

    reactiveUtils
      .whenOnce(() => jmvObjRef.current.view.ready)
      .then(() => {
        console.log('MapView is ready.');
      });

    setMapLoad(true);
  };

  // get available image list
  useEffect(() => {
    let intervalFetch: NodeJS.Timer;

    // fetch task for Rainviewer
    const fetchTimePath = () => {
      fetch(coverageURL)
        .then(async (response) => {
          return response.json();
        })
        .then((data) => {
          const dateList = [...data.radar.past, ...data.radar.nowcast];
          setTimePathList(dateList);

          setTimePath(data.radar.past[data.radar.past.length - 1]);
          pastTimePathRef.current = data.radar.past[data.radar.past.length - 2];
        })
        .catch((err) => console.log(err));
    };

    const generateDateList = () => {
      let currentTime = getRoundDownUnixTs();
      const newDateList: RainviewerItem[] = [];
      const length = 16;
      for (let dt = 0; dt < length; dt++) {
        newDateList.push({
          path: getBOMPath(currentTime),
          time: currentTime
        });
        currentTime -= 600;
      }
      newDateList.sort((a, b) => a.time - b.time);
      setTimePathList(newDateList);
      setTimePath(newDateList[newDateList.length - 1]);
      pastTimePathRef.current = newDateList[newDateList.length - 2];
    };

    const runFunction = () => {
      if (dataSource === '1') fetchTimePath();
      if (dataSource === '2') generateDateList();
    };

    if (firstLoad) {
      // run on first load
      runFunction();

      let timeout = getRoundUpUnixTs() - new Date().getTime() / 1000;
      timeout = Math.round(timeout * 1000 + 60000); // add 60 seconds to ensure data readiness

      // run 1 time
      intervalFetch = setTimeout(() => {
        runFunction();
        setFirstLoad(false);
      }, timeout);
    } else {
      // interval run
      const timeout = 600000; // 10.5 minutes

      intervalFetch = setInterval(() => {
        runFunction();
      }, timeout);
    }

    return () => {
      clearTimeout(intervalFetch);
      clearInterval(intervalFetch);
    };
  }, [coverageURL, dataSource, firstLoad]);

  // time path list hook
  useEffect(() => {
    if (timePathList.length > 1) {
      timePathList.forEach((tp) => {
        loadMapTask(tp);
      });
    }
    return () => {
      mapCleanupTask();
    };
  }, [loadMapTask, mapCleanupTask, timePathList]);

  // time path hook
  useEffect(() => {
    showHideMapTask(timePath);
    return () => {
      pastTimePathRef.current = timePath;
      // cancelAnimationFrame(delayHideRef.current);
    };
  }, [timePath]);

  return (
    <div className="jimu-widget">
      {props.useMapWidgetIds && props.useMapWidgetIds.length === 1 && (
        <JimuMapViewComponent
          useMapWidgetId={props.useMapWidgetIds?.[0]}
          onActiveViewChange={activeViewChangeHandler}
        />
      )}
      <div className="alert-box">
        <Alert
          // closable
          form="basic"
          onClose={() => {}}
          open={!mapLoad}
          text={'Please select a map in settings'}
          type="info"
          withIcon
        />
      </div>
      {jmvObjRef.current !== null && (
        <div className="main-grid">
          {generateColorLegend(colorScheme, true)}
          <TimeSlider
            timePath={timePath}
            setTimePath={setTimePath}
            play={play}
            setPlay={setPlay}
            timePathList={timePathList}
            relativeTime={relativeTime}
          />
        </div>
      )}
      {/* <div>
        <Modal isOpen={errorMode === TIMEOUT}>
          <ModalHeader>Error</ModalHeader>
          <ModalBody>
            {errorMode}
            <br />
            Please refresh the page
          </ModalBody>
        </Modal>
      </div> */}
      {jmvObjRef.current === null && (
        <div>
          <Loading />
        </div>
      )}
    </div>
  );
};

export default Widget;
