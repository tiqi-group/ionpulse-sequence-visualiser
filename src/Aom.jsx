import { Card } from "react-bootstrap";

function AOM({ aomConfiguration }) {
  return (
    <Card>
      <Card.Body>
        <Card.Title>{aomConfiguration.name}</Card.Title>
        <Card.Subtitle>Details</Card.Subtitle>
        <ul className="list-unstyled">
          <li>Type: {aomConfiguration.type}</li>
          <li>Central frequency: {aomConfiguration.central_frequency} MHz</li>
          <li>Order: {aomConfiguration.order}</li>
        </ul>
        <Card.Subtitle>Hardware channels</Card.Subtitle>
        <ul>
          {aomConfiguration.hw_channels.map((elem, i) => {
            return <li key={i}>{elem}</li>;
          })}
        </ul>
      </Card.Body>
    </Card>
  );

  //TODO: Add connection to light2bytes server.
}

export default AOM;
