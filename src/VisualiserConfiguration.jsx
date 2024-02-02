import React, { useState, createElement, Component } from "react";
import Grid from "@mui/material/Grid";
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "#1A2027" : "#fff",
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: "center",
  color: theme.palette.text.secondary,
}));
const style_enabled = {
  fontSize: 14,
  color: "#009411",
};

const style_disabled = {
  fontSize: 14,
  color: "#808080",
};

class EnableChannel extends Component {
  constructor(props) {
    super(props);
  }

  handleClick(e) {
    this.props.onClick({ name: this.props.channelName });
  }

  render() {
    return (
      <div>
        <React.Fragment>
          {this.props.isEnabled &&
            createElement(
              "p",
              {
                style: style_enabled,
                onClick: this.handleClick.bind(this),
              },
              this.props.displayName,
            )}
          {!this.props.isEnabled &&
            createElement(
              "p",
              {
                style: style_disabled,
                onClick: this.handleClick.bind(this),
              },
              this.props.displayName,
            )}
        </React.Fragment>
      </div>
    );
  }
}

class EnablingGroup extends Component {
  constructor(props) {
    super(props);
  }

  onClickElement(e) {
    this.props.onEvent(e);
  }

  addElement(el) {
    cols = [];
    for (type of ["RF", "TTL", "PMT"]) {
      element_key = type + el;
      if (this.props.channelEnabled.hasOwn(element_key)) {
        cols.push(
          <div className="col">
            {createElement(EnableChannel, {
              //channel: this.props.groupType + el,
              channelName: element_key,
              displayName: this.props.channelDescription[element_key].name,
              onClick: this.onClickElement.bind(this),
              isEnabled: this.props.channelEnabled[element_key],
            })}
          </div>,
        );
      }
    }
    return (
      <div className="container" key={"enablerDiv" + el}>
        <div className="row justify-content-center">cols</div>
      </div>
    );
  }

  addAllElements() {
    const nRows = Object.values(this.props.channelDescription).reduce(
      (count, val) => (count += val.group === "RF"),
      0,
    );
    return Array.from(Array(Math.max(nRows, 32)).keys()).map((i) =>
      this.addElement(i),
    );
  }

  render() {
    return (
      <div>
        <Box sx={{ flexGrow: 1 }}>
          <Grid
            container
            rowSpacing={1}
            columnSpacing={{ xs: 1, sm: 2, md: 3 }}
          >
            {this.addAllElements()}
          </Grid>
        </Box>
      </div>
    );
  }
}

export { EnablingGroup };
