import AOM from "./Aom";
import { Card, CardGroup, Container, Col, Row } from "react-bootstrap";

const channelGroups = ["RF", "TTL", "PMT", "Readout"];

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
            <AOM key={key} aomConfiguration={value} />
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
                <Card.Subtitle>Hardware channels</Card.Subtitle>
                <Card.Text>{value.hw_channels}</Card.Text>
                <Card.Subtitle>Subchannel</Card.Subtitle>
                <Card.Text>{value.sub_channel}</Card.Text>
              </Card.Body>
            </Card>
          </Col>,
        );
        break;
      case "Readout":
        cards[value.group].push(
          <Col key={key}>
            <Card style={{ width: "18rem" }}>
              <Card.Body>
                <Card.Title>{value.name}</Card.Title>
                <Card.Subtitle>Hardware channels</Card.Subtitle>
                <Card.Text>{value.hw_channels}</Card.Text>
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
        <Row key={"" + group + cardIdx} sm={cardsPerRow} className="mt-4">
          {cards[group].slice(cardIdx, cardIdx + cardsPerRow)}
        </Row>,
      );
    }
  }

  return <Container>{cardRows}</Container>;
};

export { Hardware, channelGroups };
