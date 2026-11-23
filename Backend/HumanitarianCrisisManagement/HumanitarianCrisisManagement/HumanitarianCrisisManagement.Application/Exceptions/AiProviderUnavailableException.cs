namespace HumanitarianCrisisManagement.Application.Exceptions;

public class AiProviderUnavailableException : Exception
{
    public AiProviderUnavailableException(string message)
        : base(message)
    {
    }
}
