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
    let channelEnabledInit = {};
    for (const k in props.channelDescription) {
      channelEnabledInit[k] = true;
    }
    this.state = {
      channelEnabled: channelEnabledInit,
    };
  }

  componentDidMount() {
    this.handleEnableChange = this.handleEnableChange.bind(this);
  }

  componentDidUpdate() {
    const channelEnabledKeys = Object.keys(this.state.channelEnabled);
    const channelDescKeys = Object.keys(this.props.channelDescription);
    const allKeys = channelEnabledKeys.concat(channelDescKeys);
    const union = new Set(allKeys);

    if (union.size !== channelEnabledKeys.length) {
      let newChannelEnabled = { ...this.state.channelEnabled };
      for (const k of channelDescKeys) {
        if (!(k in this.state.channelEnabled)) {
          newChannelEnabled[k] = true;
        }
      }
      this.setState({ channelEnabled: newChannelEnabled });
    }
  }

  handleEnableChange(e) {
    let newChannelEnabled = { ...this.state.channelEnabled };
    newChannelEnabled[e.name].isEnabled = !newChannelEnabled[e.name].isEnabled;
    this.setState({
      channelEnabled: newChannelEnabled,
    });
  }

  render() {
    return (
      <div>
        <EnablingGroupOff
          Enablers={
            <EnablingGroup
              channelDescription={this.props.channelDescription}
              channelEnabled={this.state.channelEnabled}
              onEvent={this.handleEnableChange}
            />
          }
        />
        <SequencePlot
          channelDescription={this.props.channelDescription}
          channelEnabled={this.state.channelEnabled}
        />
      </div>
    );
  }
}

export { SequencePlotPage };
