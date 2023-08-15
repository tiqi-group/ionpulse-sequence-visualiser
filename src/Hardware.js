import AOM from "./Aom"
let Hardware = function(input){
    if(Object.keys(input.aomConfiguration).length > 0)
    
    for (let [key, value] of Object.keys(input.aomConfiguration)){
        <AOM
            aomConfiguration = {value}
        />
        }
    
    return(
        Object.values(input.aomConfiguration).map(value => <AOM aomConfiguration = {value}/>)
    )

}

export {Hardware}