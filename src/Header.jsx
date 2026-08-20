import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import NavDropdown from "react-bootstrap/NavDropdown";
import { Link } from "react-router-dom";
import packageJson from "/package.json";
import { isEmbedded } from "./embeddedMode";

function NavBar({ visualizeLatest, onVisualizeLatestChange }) {
  return (
    <Navbar expand="lg" className="bg-body-tertiary">
      <Container>
        {!isEmbedded && (
          <Navbar.Brand as={Link} to="/">
            Sequence Visualizer {packageJson.version}
          </Navbar.Brand>
        )}
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/plot">
              Plot
            </Nav.Link>
            <Nav.Link as={Link} to="/hardware">
              Hardware
            </Nav.Link>
            {!isEmbedded && (
              <Nav.Link as={Link} to="/config">
                Configure
              </Nav.Link>
            )}
            <NavDropdown title="JSON source" id="collapsible-plot-dropdown">
              <NavDropdown.Item as={Link} to="/sequencejson">
                Sequence JSON
              </NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/descriptionjson">
                Hardware description JSON
              </NavDropdown.Item>
            </NavDropdown>
          </Nav>
          <Form.Check
            type="switch"
            id="visualize-latest-switch"
            label="Visualize latest"
            title="Update the plot whenever a new sequence is executed"
            checked={visualizeLatest}
            onChange={(e) => onVisualizeLatestChange(e.target.checked)}
          />
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default NavBar;
