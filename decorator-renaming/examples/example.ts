var testVariable: string = "Hallo"; // "var" and ": string" is hidden
testVariable = "";

const anotherVariableThatHasAnExtremelyLongVariableNameForTestingOfEdgeCasesSinceWeAlsoLikeToConsiderLongVariableNames2: string = "Ciao";

function test123(a, b, ...c): void { //": void" is hidden
    console.log(a,b, ...c);
};

const test456 = (x: string): void => {
    console.log(x);
}

test123('Foo', 'bar', 1, 2, 3, 4) //inline hints (parameters)

console.log('a', 'b', 'c', 'd', 'e')

console.log(anotherVariableThatHasAnExtremelyLongVariableNameForTestingOfEdgeCasesSinceWeAlsoLikeToConsiderLongVariableNames2)
