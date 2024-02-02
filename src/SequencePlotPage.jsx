import { Component } from "react";

import EnablingGroupOff from "./OffCanvas";
import { EnablingGroup } from "./VisualiserConfiguration";
import { SequencePlot } from "./SequencePlot";

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
              onEvent={this.handleEnableChange.bind(this)}
            />
          }
        />
        <SequencePlot
          channelDescription={this.props.channelDescription}
          channelEnabled={this.state.channelEnabled}
          sequenceData={this.props.sequenceData}
        />
      </div>
    );
  }
}

export { SequencePlotPage };
