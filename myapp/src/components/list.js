import React, { useState } from 'react';
function List(){
    const[list, setList] = useState(['test1', 'test2']);
    return <>
    <h1>My List</h1>
    <ul>
      list.map{el=><li>{el}</li>}

    </ul>
    </>
    

}
export default List;
