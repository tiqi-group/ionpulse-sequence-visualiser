import Card from "react-bootstrap/Card";

function AOM(input) {
  return (
    <Card style={{ width: "18rem" }}>
      <Card.Body>
        <Card.Title>{input.aomConfiguration.name}</Card.Title>
        <Card.Subtitle className="mb-2 text-muted">
          Type: {input.aomConfiguration.type}
        </Card.Subtitle>
        <Card.Subtitle className="mb-2 text-muted">
          Central frequency: {input.aomConfiguration.central_frequency}
        </Card.Subtitle>
        <Card.Subtitle className="mb-2 text-muted">
          Order: {input.aomConfiguration.order}
        </Card.Subtitle>
        <Card.Subtitle className="mb-2 text-muted">
          Input channels: {input.aomConfiguration.dds_channels}
        </Card.Subtitle>
        {/* <Card.Text>
          Some quick example text to build on the card title and make up the
          bulk of the card's content.
        </Card.Text> */}
        {/* <Card.Link href="#">Card Link</Card.Link>
        <Card.Link href="#">Another Link</Card.Link> */}
      </Card.Body>
    </Card>
  );

  //TODO: Add connection to light2bytes server.
}

export default AOM;
