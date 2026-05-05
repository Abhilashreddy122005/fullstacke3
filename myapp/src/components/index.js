import {usestate} from 'react';
import scooter from './scooter';
import List from './list';
const[count, setCount] = useState(0);
const[list, setList] = useState(['test1', 'test2']);
const
function App() {
  return <>
    <scooter/>
    <List/>
    </>
