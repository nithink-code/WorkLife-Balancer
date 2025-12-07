import React from 'react';
import './About.css';
import nithinImage from '/NithinK.png';
import Navbar from '../Navbar';

const About = () => {
  return (
    <>
      <Navbar />
      <div className="about-container">
        <div className="about-card">
          <div className="about-image-container">
            <img src={nithinImage} alt="Nithin K" className="about-image" />
          </div>
          <div className="about-content">
            <h1>Nithin K</h1>
            <h2>Full Stack Developer</h2>
            <p>
              A passionate Full Stack Developer with experience in building web
              applications with React JS, Node.js and other cool
              technologies. I love turning ideas into reality and creating
              beautiful and functional products.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default About;
