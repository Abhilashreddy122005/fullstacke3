import { useState } from "react";
function scooter() {
    const{color,setColor} = useState("red");
    const{brand,setBrand} = useState("honda");
    const{model,setModel} = useState("xsr");
    const{year,setYear} = useState(2026);
    return <>
    <h1>My scooter</h1>
    <p>Color: {color}</p>
    <p>Brand: {brand}</p>
    <p>Model: {model}</p>
    <p>Year: {year}</p>
    </>


}
export default scooter;