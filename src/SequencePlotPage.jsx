import { Component } from "react";

import EnablingGroupOff from "./OffCanvas";
import { EnablingGroup } from "./VisualiserConfiguration";
import { SequencePlot } from "./SequencePlot";

// https://stackoverflow.com/questions/14368596/how-can-i-check-that-two-objects-have-the-same-set-of-property-names
function objectsHaveSameKeys(...objects) {
  const allKeys = objects.reduce(
    (keys, object) => keys.concat(Object.keys(object)),
    [],
  );
  const union = new Set(allKeys);
  return objects.every((object) => union.size === Object.keys(object).length);
}

class SequencePlotPage extends Component {
  constructor(props) {
    super(props);
    let channelSettingsInit = {};
    for (const k in props.channelDescription) {
      channelSettingsInit[k] = {
        type: props.channelDescription[k].group,
        isEnabled: true,
      };
    }
    this.state = {
      channelSettings: channelSettingsInit,
    };
  }

  componentDidMount() {
    this.handleEnableChange = this.handleEnableChange.bind(this);
  }

  componentDidUpdate(prevProps) {
    console.log("Called componentDidUpdate");
    const prevChannelDescKeys = Object.keys(prevProps.channelDescription);
    const channelDescKeys = Object.keys(this.props.channelDescription);
    const allKeys = prevChannelDescKeys.concat(channelDescKeys);
    const union = new Set(allKeys);

    if (union.size !== prevChannelDescKeys.length) {
      let newChannelSettings = { ...this.state.channelSettings };
      for (const k in channelDescKeys) {
        if ((!k) in this.state.channelSettings) {
          newChannelSettings[k] = {
            type: this.props.channelDescription[k].group,
            isEnabled: true,
          };
        }
      }
      this.setState({ channelSettings: newChannelSettings });
    }
  }

  handleEnableChange(e) {
    let newChannelSettings = { ...this.state.channelSettings };
    newChannelSettings[e.name].isEnabled =
      !newChannelSettings[e.name].isEnabled;
    this.setState({
      channelSettings: newChannelSettings,
    });
  }

  render() {
    console.log("Render SequencePlotPage");
    return (
      <div>
        <EnablingGroupOff
          Enablers={
            <EnablingGroup
              channelDescription={this.props.channelDescription}
              channelSettings={this.state.channelSettings}
              onEvent={this.handleEnableChange}
            />
          }
        />
        <SequencePlot
          channelDescription={this.props.channelDescription}
          channelSettings={this.state.channelSettings}
        />
      </div>
    );
  }
}

export { SequencePlotPage };
