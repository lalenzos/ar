var testVariable: string = "Hallo"; 
testVariable = "";

const anotherVariableThatHasAnExtremelyLongVariableNameForTestingOfEdgeCasesSinceWeAlsoLikeToConsiderLongVariableNames2: string = "Ciao";

function test123(a, b, ...c): void { 
    console.log(a,b, ...c);
};

const test456 = (x: string): void => {
    console.log(x);
}

test123('Foo', 'bar', 1, 2, 3, 4) 

console.log('a', 'b', 'c', 'd', 'e')

console.log(anotherVariableThatHasAnExtremelyLongVariableNameForTestingOfEdgeCasesSinceWeAlsoLikeToConsiderLongVariableNames2)
