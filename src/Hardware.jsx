import AOM from "./Aom";
import { Card, CardGroup, Container, Col, Row } from "react-bootstrap";

const channelGroups = ["RF", "TTL", "PMT", "RTD", "Readout"];
// RTD: remote Triggered Devices

const Hardware = function ({ channelDescription }) {
  let cards = channelGroups.reduce((obj, group) => {
    obj[group] = [];
    return obj;
  }, {});
  for (let [key, value] of Object.entries(channelDescription)) {
    switch (value.group) {
      case "RF":
        cards[value.group].push(
          <Col key={key}>
            <AOM aomConfiguration={value} />
          </Col>,
        );
        break;
      case "TTL":
      case "PMT":
        cards[value.group].push(
          <Col key={key}>
            <Card>
              <Card.Body>
                <Card.Title>{value.name}</Card.Title>
                <Card.Subtitle>Subchannel</Card.Subtitle>
                <ul className="list-unstyled">
                  <li>Type: {value.sub_channel.type}</li>
                  <li>Index: {value.sub_channel.idx}</li>
                </ul>
                <Card.Subtitle>Hardware channels</Card.Subtitle>
                <ul>
                  {value.hw_channels.map((elem, i) => {
                    return <li key={i}>{elem}</li>;
                  })}
                </ul>
              </Card.Body>
            </Card>
          </Col>,
        );
        break;
      case "RTD":
      case "Readout":
        cards[value.group].push(
          <Col key={key}>
            <Card>
              <Card.Body>
                <Card.Title>{value.name}</Card.Title>
                <Card.Subtitle>Hardware channels</Card.Subtitle>
                <ul>
                  {value.hw_channels.map((elem, i) => {
                    return <li key={i}>{elem}</li>;
                  })}
                </ul>
              </Card.Body>
            </Card>
          </Col>,
        );
        break;
    }
  }

  let cardRows = [];

  const cardsPerRow = 4;
  for (let group of channelGroups) {
    const nCols = cards[group].length / cardsPerRow;
    for (
      let cardIdx = 0;
      cardIdx < cards[group].length;
      cardIdx = cardIdx + cardsPerRow
    ) {
      if (cardIdx == 0) {
        cardRows.push(
          <h2 key={"title" + group} className="mt-5">
            {group}
          </h2>,
        );
      }
      cardRows.push(
        <Row
          key={"" + group + cardIdx}
          sm="2"
          xs="1"
          md={cardsPerRow}
          className="mt-4"
        >
          {cards[group].slice(cardIdx, cardIdx + cardsPerRow)}
        </Row>,
      );
    }
  }

  return <Container className="mb-4">{cardRows}</Container>;
};

export { Hardware, channelGroups };
