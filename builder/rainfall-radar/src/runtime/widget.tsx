import { React, AllWidgetProps } from 'jimu-core';
import { JimuMapViewComponent, JimuMapView } from 'jimu-arcgis';
import WebTileLayer from 'esri/layers/WebTileLayer';
import reactiveUtils from 'esri/core/reactiveUtils';
import { Loading } from 'jimu-ui';
import { IMConfig, RainviewerItem } from '../config';
import {
  findLayers,
  generateColorLegend,
  generateTileID,
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
    opacity
  } = props.config;

  const [timePath, setTimePath] = useState<RainviewerItem>(initialTimePath);
  const [timePathList, setTimePathList] = useState<RainviewerItem[]>([
    initialTimePath
  ]);
  const [firstLoad, setFirstLoad] = useState<boolean>(true);
  const [play, setPlay] = useState<boolean>(playOnLoad);

  const jmvObjRef = useRef<JimuMapView>(null);

  // BOM API
  // https://api.weather.bom.gov.au/v1/rainradar/tiles/202302030250/9/469/307.png

  // generate web tile layer
  const generateWebTileLayer = useCallback(
    (tPath: RainviewerItem): WebTileLayer => {
      const id = generateTileID(tPath.time);
      // Create a WebTileLayer for Nearmap imagery.
      // We are using tileinfo we created earlier.
      const wtl = new WebTileLayer({
        urlTemplate: `https://tilecache.rainviewer.com/${tPath.path}/256/{z}/{x}/{y}/${colorScheme}/1_0.png`,
        copyright:
          '<a href="https://www.rainviewer.com/api.html">Rainviewer</a> | Bureau of Meteorology Australia',
        title: `Rainviewer for ${id}`,
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
    [colorScheme, opacity]
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
      const oldLayers = findLayers(jmvObjRef.current.view.map.layers, 'base-');
      jmvObjRef.current.view.map.removeMany(oldLayers);
    }
  }, []);

  // show or hide map
  const showHideMapTask = (tPath: RainviewerItem, show = true) => {
    const oldLayers = findLayers(
      jmvObjRef.current.view.map.layers,
      `${tPath.time}`
    );
    if (oldLayers.length !== 0) {
      oldLayers[0].listMode = show ? 'show' : 'hide';
      oldLayers[0].visible = !!show;
    }
  };

  const activeViewChangeHandler = (jmvObj: JimuMapView) => {
    jmvObjRef.current = jmvObj;

    reactiveUtils
      .whenOnce(() => jmvObjRef.current.view.ready)
      .then(() => {
        console.log('MapView is ready.');
      });
  };

  // get available image list
  useEffect(() => {
    let intervalFetch: NodeJS.Timer;

    // fetch task
    const fetchTimePath = () => {
      fetch(coverageURL)
        .then(async (response) => {
          return response.json();
        })
        .then((data) => {
          const dateList = [...data.radar.past, ...data.radar.nowcast];
          setTimePathList(dateList);

          setTimePath(data.radar.past[data.radar.past.length - 1]);
        })
        .catch((err) => console.log(err));
    };

    if (firstLoad) {
      // run on first load
      fetchTimePath();

      let timeout = getRoundUpUnixTs() - new Date().getTime() / 1000;
      timeout = Math.round(timeout * 1000 + 60000); // add 60 seconds to ensure data readiness

      // run 1 time
      intervalFetch = setTimeout(() => {
        fetchTimePath();
        setFirstLoad(false);
      }, timeout);
    } else {
      // interval run
      const timeout = 600000; // 10.5 minutes

      intervalFetch = setInterval(() => {
        fetchTimePath();
      }, timeout);
    }

    return () => {
      clearTimeout(intervalFetch);
      clearInterval(intervalFetch);
    };
  }, [coverageURL, firstLoad]);

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
    showHideMapTask(timePath, true);
    return () => {
      showHideMapTask(timePath, false);
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
      {/* <div className="alert-box">
        <Alert
          // closable
          form="basic"
          onClose={() => {}}
          open={errorMode === NO_DATE || errorMode === NO_AUTHORIZE}
          text={errorMode}
          type="info"
          withIcon
        />
      </div> */}
      {jmvObjRef.current !== null && (
        <div className="main-grid">
          {generateColorLegend(colorScheme, true)}
          <TimeSlider
            timePath={timePath}
            setTimePath={setTimePath}
            play={play}
            setPlay={setPlay}
            timePathList={timePathList}
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
