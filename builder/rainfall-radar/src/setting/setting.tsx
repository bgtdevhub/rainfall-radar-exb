import { React } from 'jimu-core';
import { AllWidgetSettingProps } from 'jimu-for-builder';
import {
  Dropdown,
  DropdownButton,
  DropdownItem,
  DropdownMenu,
  Slider,
  Switch
} from 'jimu-ui';
import {
  MapWidgetSelector,
  SettingSection,
  SettingRow
} from 'jimu-ui/advanced/setting-components';
import { IMConfig, colorScheme } from '../config';
import { generateColorLegend } from '../runtime/components/Utils';
import '../runtime/widget.css';

const Setting = (props: AllWidgetSettingProps<IMConfig>) => {
  const propChange = (obj: string, value: any) => {
    console.log(value);
    props.onSettingChange({
      id: props.id,
      config: {
        ...props.config,
        [obj]: value
      }
    });
  };

  const onMapWidgetSelected = (useMapWidgetId: string[]) => {
    props.onSettingChange({
      id: props.id,
      useMapWidgetIds: useMapWidgetId
    });
  };

  const renderDropdownItem = () => {
    return colorScheme.map((cs) => {
      return (
        <DropdownItem
          key={cs.value}
          value={cs.value}
          className="color-dropdown-item"
          onClick={(e: React.ChangeEvent<HTMLInputElement>) => {
            propChange('colorScheme', e.target.value);
          }}
        >
          <div className="div-dropdown-item">
            <h6>{cs.text}</h6>
            <small>Rain</small>
            {generateColorLegend(cs.value, true, false)}
          </div>
        </DropdownItem>
      );
    });
  };

  const getColorSchemeText = () => {
    const x = colorScheme.find((cs) => cs.value === props.config.colorScheme);
    return x.text;
  };

  return (
    <div>
      <SettingSection title="Select Map">
        <SettingRow>
          <MapWidgetSelector
            onSelect={onMapWidgetSelected}
            useMapWidgetIds={props.useMapWidgetIds}
          />
        </SettingRow>
      </SettingSection>
      <SettingSection title="Appearance">
        <SettingRow>Color Scheme</SettingRow>
        <SettingRow>
          <Dropdown fluid title="Select Colour Scheme">
            <DropdownButton>{getColorSchemeText()}</DropdownButton>
            <DropdownMenu className="color-dropdown">
              {renderDropdownItem()}
            </DropdownMenu>
          </Dropdown>
        </SettingRow>
        <SettingRow>Opacity</SettingRow>
        <SettingRow>
          <Slider
            aria-label="Rainviewer Opacity"
            defaultValue={props.config.opacity}
            max={1}
            min={0}
            onChange={(e) => propChange('opacity', e.target.value)}
            step={0.1}
          />
        </SettingRow>
        <SettingRow>
          <label className="w-100 justify-content-start">
            Play on load
            <Switch
              className="ml-auto mr-0"
              checked={props.config.playOnLoad}
              onChange={(e) => propChange('playOnLoad', e.target.checked)}
            />
          </label>
        </SettingRow>
      </SettingSection>
    </div>
  );
};

export default Setting;
