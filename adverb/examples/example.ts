var testVariable: string = "Hallo";
testVariable = "";

const anotherVariableThatHasAnExtremelyLongVariableNameForTestingOfEdgeCasesSinceWeAlsoLikeToConsiderLongVariableNames2: string = "Ciao";

function test123(a, b, ...c): void {
    console.log(a, b, ...c);
};

const test456 = (x: string): void => {
    console.log(x);
};

test123('Foo', 'bar', 1, 2, 3, 4);

console.log('a', 'b', 'c', 'd', 'e');


function greet (userName) {
    console.log("Good morning " + userName);
}


console.log(anotherVariableThatHasAnExtremelyLongVariableNameForTestingOfEdgeCasesSinceWeAlsoLikeToConsiderLongVariableNames2);


const formatDateTimeForExport = (value) => {
    if (value) {
        const date = new Date(value);
        let day = date.getDate().toString();
        if (day.length === 1) day = `0${day}`;
        let month = (date.getMonth() + 1).toString();
        if (month.length === 1) month = `0${month}`;
        let hours = date.getHours().toString();
        if (hours.length === 1) hours = `0${hours}`;
        let minutes = date.getMinutes().toString();
        if (minutes.length === 1) minutes = `0${minutes}`;
        return `${date.getFullYear()}-${month}-${day}_${hours}-${minutes}`;
    }
    return "";
};



def <extra_id_0>(configuration, section, output, test_id, func):
    result = []
    plugin_list = configuration[section]["enabled_plugins"].split()    
    plugin_base = PluginBase(package='plugins')
    plugin_source = plugin_base.make_plugin_source(searchpath=['./plugins'])

    for plugin_name in plugin_list:        
        logging.debug(f"Executing {func} of plugin {plugin_name}.")
        plugin = plugin_source.load_plugin(plugin_name)
        try:
            function_to_call = getattr(plugin, func, None)
            if function_to_call!=None:
                plugin_state = ", ".join(global_plugin_state.keys())
                logging.debug(f"Current plugin state contains [{plugin_state}]")

                call_result = function_to_call(global_plugin_state, configuration[section], output, test_id)
                result.append(call_result)
                
        except Exception as e:
            logging.critical(f"Cannot invoke plugin {plugin_name}: {e}")
    
    return result

    

console.log(new Date());